// BLONDA AKAI — MPC Sample (AC50) host. Runs instead of the stock app, from RAM, without touching flash:
//
//   systemd-run --unit=blonda --collect -p RuntimeMaxSec=3600 \
//     -p ExecStartPre="/usr/bin/systemctl stop ac50.service" \
//     -p ExecStopPost="/usr/bin/systemctl start ac50.service" /run/blonda-akai
//
// systemd stops the stock app first and always starts it again when this program exits, crashes or hits the
// time limit. Quit from the device with SHIFT + STOP.
//
// Hardware facts (I2S at a fixed 44.1 kHz S32_LE, the control surface on ALSA raw MIDI, the SPI screen through
// DRM with explicit damage updates, SCHED_FIFO below the IRQ threads) are from the public notes in
// github.com/gospodindilly-ops/mpc-sample-lab, verified there on firmware 1.3.0.12. Independent implementation.
//
//   blonda-akai              run on the device
//   blonda-akai --selftest   no hardware: render with simulated pads, print CPU per instrument (safe while the
//                            stock app runs; also used to check the ARM build under an emulator)
#include "akai/app.hpp"
#include "akai/screen.hpp"

#include <atomic>
#include <cerrno>
#include <climits>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <dirent.h>
#include <fcntl.h>
#include <pthread.h>
#include <sched.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <memory>
#include <thread>
#include <vector>

#include <drm/drm.h>
#include <drm/drm_mode.h>
#include <sound/asound.h>

namespace {

constexpr int kRate = 44100, kPeriod = 128, kPeriods = 3;
std::atomic<bool> gStop{false};
void onSignal(int) { gStop = true; }

double nowSec() { timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec * 1e-9; }

// ALSA card numbers change between boots; the /dev/snd/by-path links ("../controlC2") do not.
int cardByPath(const char* link) {
    char buf[256]; const ssize_t n = readlink(link, buf, sizeof buf - 1);
    if (n <= 0) return -1;
    buf[n] = 0;
    const char* c = std::strstr(buf, "controlC");
    return c ? std::atoi(c + 8) : -1;
}

// ---------------------------------------------------------------- PCM (raw kernel interface, no libasound)
void maskSet(snd_pcm_hw_params& p, int param, unsigned bit) {
    snd_mask& m = p.masks[param - SNDRV_PCM_HW_PARAM_FIRST_MASK];
    std::memset(m.bits, 0, sizeof m.bits);
    m.bits[bit >> 5] |= 1u << (bit & 31);
}
void intervalSet(snd_pcm_hw_params& p, int param, unsigned v) {
    snd_interval& i = p.intervals[param - SNDRV_PCM_HW_PARAM_FIRST_INTERVAL];
    i.min = i.max = v; i.openmin = i.openmax = 0; i.integer = 1; i.empty = 0;
}

int pcmOpen(int card) {
    char path[64]; std::snprintf(path, sizeof path, "/dev/snd/pcmC%dD0p", card);
    const int fd = open(path, O_RDWR | O_CLOEXEC);
    if (fd < 0) { std::fprintf(stderr, "%s: %s\n", path, std::strerror(errno)); return -1; }
    snd_pcm_hw_params hw; std::memset(&hw, 0, sizeof hw);
    for (int n = SNDRV_PCM_HW_PARAM_FIRST_MASK; n <= SNDRV_PCM_HW_PARAM_LAST_MASK; ++n)
        std::memset(hw.masks[n - SNDRV_PCM_HW_PARAM_FIRST_MASK].bits, 0xff, sizeof hw.masks[0].bits);
    for (int n = SNDRV_PCM_HW_PARAM_FIRST_INTERVAL; n <= SNDRV_PCM_HW_PARAM_LAST_INTERVAL; ++n) {
        snd_interval& i = hw.intervals[n - SNDRV_PCM_HW_PARAM_FIRST_INTERVAL]; i.min = 0; i.max = UINT_MAX;
    }
    hw.rmask = ~0u; hw.cmask = 0; hw.info = ~0u;
    maskSet(hw, SNDRV_PCM_HW_PARAM_ACCESS, SNDRV_PCM_ACCESS_RW_INTERLEAVED);
    maskSet(hw, SNDRV_PCM_HW_PARAM_FORMAT, SNDRV_PCM_FORMAT_S32_LE);
    maskSet(hw, SNDRV_PCM_HW_PARAM_SUBFORMAT, SNDRV_PCM_SUBFORMAT_STD);
    intervalSet(hw, SNDRV_PCM_HW_PARAM_CHANNELS, 2);
    intervalSet(hw, SNDRV_PCM_HW_PARAM_RATE, kRate);
    intervalSet(hw, SNDRV_PCM_HW_PARAM_PERIOD_SIZE, kPeriod);
    intervalSet(hw, SNDRV_PCM_HW_PARAM_BUFFER_SIZE, kPeriod * kPeriods);
    if (ioctl(fd, SNDRV_PCM_IOCTL_HW_PARAMS, &hw) < 0) { std::fprintf(stderr, "pcm hw_params: %s\n", std::strerror(errno)); close(fd); return -1; }
    if (ioctl(fd, SNDRV_PCM_IOCTL_PREPARE) < 0) { std::fprintf(stderr, "pcm prepare: %s\n", std::strerror(errno)); close(fd); return -1; }
    return fd;
}

// Blocking write of one period; recovers from underruns. Returns false on a hard error.
bool pcmWrite(int fd, const int32_t* frames, int n, int& xruns) {
    snd_xferi x; std::memset(&x, 0, sizeof x);
    x.buf = (void*)frames; x.frames = (snd_pcm_uframes_t)n;
    while (ioctl(fd, SNDRV_PCM_IOCTL_WRITEI_FRAMES, &x) < 0) {
        if (errno == EINTR) { if (gStop) return false; continue; }
        if (errno != EPIPE || ioctl(fd, SNDRV_PCM_IOCTL_PREPARE) < 0) { std::perror("pcm write"); return false; }
        ++xruns;
    }
    return true;
}

// ---------------------------------------------------------------- MIDI ports
struct MidiPort { int fd = -1; int card = -1; akai::MidiParser parser; };

int openSurface(int& surfaceCard) {
    surfaceCard = cardByPath("/dev/snd/by-path/platform-fe670000.serial");
    if (surfaceCard < 0) { std::fputs("control surface not found\n", stderr); return -1; }
    char path[64]; std::snprintf(path, sizeof path, "/dev/snd/midiC%dD0", surfaceCard);
    const int fd = open(path, O_RDWR | O_NONBLOCK | O_CLOEXEC);
    if (fd < 0) std::fprintf(stderr, "%s: %s\n", path, std::strerror(errno));
    return fd;
}

// Every other raw-MIDI input (TRS MIDI in, USB MIDI from a computer): notes play the instrument.
void openExternalMidi(int surfaceCard, std::vector<MidiPort>& ports) {
    DIR* d = opendir("/dev/snd"); if (!d) return;
    while (dirent* e = readdir(d)) {
        int card = -1, dev = -1;
        if (std::sscanf(e->d_name, "midiC%dD%d", &card, &dev) != 2 || card == surfaceCard) continue;
        char path[300]; std::snprintf(path, sizeof path, "/dev/snd/%s", e->d_name);
        const int fd = open(path, O_RDONLY | O_NONBLOCK | O_CLOEXEC);
        if (fd < 0) { std::fprintf(stderr, "%s: %s (skipped)\n", path, std::strerror(errno)); continue; }
        MidiPort p; p.fd = fd; p.card = card; ports.push_back(p);
        std::printf("external MIDI in: %s\n", path);
    }
    closedir(d);
}

// ---------------------------------------------------------------- screen (DRM dumb buffer, damage updates)
struct Screen {
    int fd = -1; uint32_t fb = 0, crtc = 0, conn = 0, pitch = 0; uint32_t* px = nullptr; size_t size = 0;
    drm_mode_modeinfo mode{};
    bool ok() const { return px != nullptr; }

    static int call(int fd, unsigned long req, void* arg, const char* what) {
        int r; while ((r = ioctl(fd, req, arg)) < 0 && errno == EINTR) {}
        if (r < 0) std::fprintf(stderr, "drm %s: %s\n", what, std::strerror(errno));
        return r;
    }
    bool open_() {
        fd = open("/dev/dri/card0", O_RDWR | O_CLOEXEC);
        if (fd < 0) { std::perror("/dev/dri/card0"); return false; }
        if (ioctl(fd, DRM_IOCTL_SET_MASTER, 0) < 0) std::fprintf(stderr, "drm set master: %s (continuing)\n", std::strerror(errno));
        drm_mode_card_res res{};
        if (call(fd, DRM_IOCTL_MODE_GETRESOURCES, &res, "getresources") < 0 || !res.count_connectors || !res.count_crtcs) return false;
        std::vector<uint32_t> conns(res.count_connectors), crtcs(res.count_crtcs);
        drm_mode_card_res res2{}; res2.count_connectors = res.count_connectors; res2.count_crtcs = res.count_crtcs;
        res2.connector_id_ptr = (uint64_t)(uintptr_t)conns.data(); res2.crtc_id_ptr = (uint64_t)(uintptr_t)crtcs.data();
        if (call(fd, DRM_IOCTL_MODE_GETRESOURCES, &res2, "getresources ids") < 0) return false;
        conn = conns[0]; crtc = crtcs[0];
        drm_mode_get_connector c{}; c.connector_id = conn;
        if (call(fd, DRM_IOCTL_MODE_GETCONNECTOR, &c, "getconnector") < 0 || !c.count_modes) return false;
        std::vector<drm_mode_modeinfo> modes(c.count_modes);
        drm_mode_get_connector c2{}; c2.connector_id = conn; c2.count_modes = c.count_modes; c2.modes_ptr = (uint64_t)(uintptr_t)modes.data();
        if (call(fd, DRM_IOCTL_MODE_GETCONNECTOR, &c2, "getconnector modes") < 0) return false;
        mode = modes[0];
        if (mode.hdisplay != akai::kScreenW || mode.vdisplay != akai::kScreenH)
            std::fprintf(stderr, "drm: unexpected mode %ux%u\n", mode.hdisplay, mode.vdisplay);
        drm_mode_create_dumb dumb{}; dumb.width = akai::kScreenW; dumb.height = akai::kScreenH; dumb.bpp = 32;
        if (call(fd, DRM_IOCTL_MODE_CREATE_DUMB, &dumb, "create dumb") < 0) return false;
        pitch = dumb.pitch; size = dumb.size;
        drm_mode_fb_cmd2 add{}; add.width = akai::kScreenW; add.height = akai::kScreenH;
        add.pixel_format = 'X' | ('R' << 8) | ('2' << 16) | ((uint32_t)'4' << 24);   // XRGB8888
        add.handles[0] = dumb.handle; add.pitches[0] = dumb.pitch;
        if (call(fd, DRM_IOCTL_MODE_ADDFB2, &add, "addfb2") < 0) return false;
        fb = add.fb_id;
        drm_mode_map_dumb map{}; map.handle = dumb.handle;
        if (call(fd, DRM_IOCTL_MODE_MAP_DUMB, &map, "map dumb") < 0) return false;
        void* p = mmap(nullptr, size, PROT_READ | PROT_WRITE, MAP_SHARED, fd, (off_t)map.offset);
        if (p == MAP_FAILED) { std::perror("drm mmap"); return false; }
        std::memset(p, 0, size);
        drm_mode_crtc set{}; set.crtc_id = crtc; set.fb_id = fb; set.set_connectors_ptr = (uint64_t)(uintptr_t)&conn; set.count_connectors = 1;
        set.mode = mode; set.mode_valid = 1;
        if (call(fd, DRM_IOCTL_MODE_SETCRTC, &set, "setcrtc") < 0) { munmap(p, size); return false; }
        px = (uint32_t*)p;
        return true;
    }
    // Send the changed rectangle to the panel. SPI: this blocks for the transfer, so only the display thread calls it.
    void flush(int x0, int y0, int x1, int y1) {
        drm_clip_rect r{}; r.x1 = (uint16_t)x0; r.y1 = (uint16_t)y0; r.x2 = (uint16_t)x1; r.y2 = (uint16_t)y1;
        drm_mode_fb_dirty_cmd d{}; d.fb_id = fb; d.num_clips = 1; d.clips_ptr = (uint64_t)(uintptr_t)&r;
        call(fd, DRM_IOCTL_MODE_DIRTYFB, &d, "dirtyfb");
    }
};

// ---------------------------------------------------------------- UI snapshot hand-off (seqlock, audio -> display)
struct UiMailbox {
    std::atomic<uint32_t> seq{0};
    akai::UiState state;
    void publish(const akai::App& app) {
        seq.fetch_add(1, std::memory_order_acq_rel);          // odd: writing
        app.snapshot(state);
        seq.fetch_add(1, std::memory_order_acq_rel);          // even: stable
    }
    bool read(akai::UiState& out, uint32_t& lastSeq) {
        for (int tries = 0; tries < 8; ++tries) {
            const uint32_t s0 = seq.load(std::memory_order_acquire);
            if (s0 & 1u) { std::this_thread::yield(); continue; }
            if (s0 == lastSeq) return false;
            std::memcpy(&out, &state, sizeof out);
            std::atomic_thread_fence(std::memory_order_acquire);
            if (seq.load(std::memory_order_relaxed) == s0) { lastSeq = s0; return true; }
        }
        return false;
    }
};

void displayThread(Screen* scr, UiMailbox* box) {
    static uint32_t frame[akai::kScreenW * akai::kScreenH], shown[akai::kScreenW * akai::kScreenH];
    std::memset(shown, 0xff, sizeof shown);
    akai::gfx::Canvas c{frame, akai::kScreenW, akai::kScreenH, akai::kScreenW};
    akai::UiState s; uint32_t last = 0;
    const int stride = (int)(scr->pitch / 4);
    while (!gStop) {
        if (box->read(s, last)) {
            akai::drawScreen(c, s);
            int x0 = akai::kScreenW, y0 = akai::kScreenH, x1 = -1, y1 = -1;
            for (int y = 0; y < akai::kScreenH; ++y) for (int x = 0; x < akai::kScreenW; ++x) {
                const uint32_t v = frame[y * akai::kScreenW + x];
                if (v == shown[y * akai::kScreenW + x]) continue;
                shown[y * akai::kScreenW + x] = v; scr->px[y * stride + x] = v;
                if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
            if (x1 >= 0) scr->flush(x0, y0, x1 + 1, y1 + 1);
        }
        usleep(33000);   // ~30 fps at most; the SPI panel manages ~20 fps full screen
    }
}

void realtime(int priority) {
    if (mlockall(MCL_CURRENT | MCL_FUTURE) < 0) std::perror("mlockall");
    sched_param sp{}; sp.sched_priority = priority;
    const int e = pthread_setschedparam(pthread_self(), SCHED_FIFO, &sp);
    if (e) std::fprintf(stderr, "SCHED_FIFO %d: %s\n", priority, std::strerror(e));
    else std::printf("audio thread: SCHED_FIFO %d, memory locked\n", priority);
}

inline int32_t toS32(float v) {
    if (v >= 1.f) return INT32_MAX;
    if (v <= -1.f) return INT32_MIN + 1;
    return (int32_t)(v * 2147483647.f);
}

// ---------------------------------------------------------------- self test (no hardware)
int selftest() {
    std::puts("BLONDA AKAI self test (no hardware): 6 held notes per instrument, 10 s each");
    auto app = std::make_unique<akai::App>(); akai::App& A = *app; A.prepare((float)kRate);
    float L[kPeriod], R[kPeriod];
    const double budget = (double)kPeriod / kRate;
    bool ok = true;
    for (int i = 0; i < A.numInstruments(); ++i) {
        A.selectInstrument(i);
        for (int p = 0; p < 6; ++p) { akai::mpcs::Event e; e.type = akai::mpcs::Event::PadDown; e.id = (uint8_t)(p * 2); e.value = 100; A.handle(e); }
        double worst = 0, total = 0; float peak = 0; bool finite = true;
        const int blocks = 10 * kRate / kPeriod;
        for (int b = 0; b < blocks; ++b) {
            const double t0 = nowSec(); A.render(L, R, kPeriod); const double dt = nowSec() - t0;
            total += dt; if (dt > worst) worst = dt;
            for (int k = 0; k < kPeriod; ++k) { finite &= L[k] == L[k] && R[k] == R[k]; const float a = L[k] > 0 ? L[k] : -L[k]; if (a > peak) peak = a; }
        }
        for (int p = 0; p < 6; ++p) { akai::mpcs::Event e; e.type = akai::mpcs::Event::PadUp; e.id = (uint8_t)(p * 2); A.handle(e); }
        akai::UiState s; A.snapshot(s);
        std::printf("  %-9s avg %5.1f%% of a core  worst %5.1f%%  peak %.2f %s\n", s.instrument, 100 * total / blocks / budget, 100 * worst / budget, peak, finite ? "" : "NaN!");
        ok &= finite && peak > 0.001f;
    }
    std::puts(ok ? "SELFTEST OK" : "SELFTEST FAIL");
    return ok ? 0 : 1;
}

} // namespace

int main(int argc, char** argv) {
    setvbuf(stdout, nullptr, _IOLBF, 0);
    if (argc > 1 && std::strcmp(argv[1], "--selftest") == 0) return selftest();

    std::signal(SIGINT, onSignal); std::signal(SIGTERM, onSignal);
    std::puts("BLONDA AKAI for MPC Sample");

    auto app = std::make_unique<akai::App>(); akai::App& A = *app;
    A.prepare((float)kRate);

    int surfaceCard = -1;
    const int surface = openSurface(surfaceCard);
    const int card = cardByPath("/dev/snd/by-path/platform-sound");
    if (surface < 0 || card < 0) { std::fputs("not running on an MPC Sample (or the stock app is still running)\n", stderr); return 1; }
    std::vector<MidiPort> ext; openExternalMidi(surfaceCard, ext);
    const int pcm = pcmOpen(card);
    if (pcm < 0) return 1;

    static Screen scr; static UiMailbox box;
    std::thread ui;
    if (scr.open_()) ui = std::thread(displayThread, &scr, &box);
    else std::fputs("screen not available, running without it\n", stderr);
    realtime(40);   // after the display thread exists, so only the audio thread is SCHED_FIFO (below IRQ threads at 50)

    static int32_t out[kPeriod * 2];
    float L[kPeriod], R[kPeriod];
    std::memset(out, 0, sizeof out);
    int xruns = 0;
    for (int i = 0; i < kPeriods - 1; ++i) pcmWrite(pcm, out, kPeriod, xruns);   // headroom before the first real block

    MidiPort surf; surf.fd = surface;
    uint8_t in[512], ledBuf[512]; int ledLen = 0, ledPos = 0;
    uint32_t published = 0;
    double busy = 0, worst = 0, windowStart = nowSec(); long long blocks = 0; float load = 0;
    const double period = (double)kPeriod / kRate;
    int fadeBlocks = -1;   // after quit: fade out over a few blocks

    while (fadeBlocks != 0) {
        if (gStop && fadeBlocks < 0) fadeBlocks = 16;
        const double t0 = nowSec();
        // 1. control surface + external MIDI
        for (;;) {
            const ssize_t n = read(surf.fd, in, sizeof in);
            if (n <= 0) break;
            akai::MidiMsg m; akai::mpcs::Event e;
            for (ssize_t i = 0; i < n; ++i) if (surf.parser.feed(in[i], m) && akai::mpcs::decode(m, e)) A.handle(e);
        }
        for (MidiPort& p : ext) for (;;) {
            const ssize_t n = read(p.fd, in, sizeof in);
            if (n <= 0) break;
            akai::MidiMsg m;
            for (ssize_t i = 0; i < n; ++i) if (p.parser.feed(in[i], m)) A.handleMidi(m);
        }
        if (A.quitRequested()) gStop = true;
        // 2. audio
        A.render(L, R, kPeriod);
        float fade = 1.f;
        if (fadeBlocks > 0) { fade = (float)(fadeBlocks - 1) / 16.f; --fadeBlocks; }
        for (int i = 0; i < kPeriod; ++i) { out[2 * i] = toS32(L[i] * fade); out[2 * i + 1] = toS32(R[i] * fade); }
        // 3. lights (non-blocking; a partial write continues next block)
        if (ledPos >= ledLen) { ledLen = A.surfaceOutput(ledBuf, sizeof ledBuf); ledPos = 0; }
        if (ledPos < ledLen) { const ssize_t w = write(surf.fd, ledBuf + ledPos, (size_t)(ledLen - ledPos)); if (w > 0) ledPos += (int)w; }
        // 4. screen
        if (A.uiVersion() != published && ui.joinable()) { box.publish(A); published = A.uiVersion(); }
        const double dt = nowSec() - t0;
        busy += dt; if (dt > worst) worst = dt; ++blocks;
        if (t0 - windowStart > 0.5) { load = (float)(busy / (t0 - windowStart)); A.setStats(load, xruns); windowStart = t0; busy = 0; }
        // 5. hand the block to the codec (blocks until there is room: this paces the loop)
        if (!pcmWrite(pcm, out, kPeriod, xruns)) break;
    }

    // lights off so the stock app starts from a clean surface
    for (int b = 0; b < 128; ++b) if (akai::mpcs::buttonHasLed(b)) { const int n = akai::mpcs::buttonLed(ledBuf, b, 0); (void)!write(surf.fd, ledBuf, (size_t)n); }
    for (int p = 0; p < 16; ++p) { const int n = akai::mpcs::padColour(ledBuf, p, 0, 0, 0); (void)!write(surf.fd, ledBuf, (size_t)n); }
    for (uint8_t cc : akai::mpcs::kBankLedCC) { const int n = akai::mpcs::buttonLed(ledBuf, cc, 0); (void)!write(surf.fd, ledBuf, (size_t)n); }
    gStop = true;
    if (ui.joinable()) ui.join();
    std::printf("blocks %lld, xruns %d, slowest block %.0f us of %.0f us, last load %.1f%%\n", blocks, xruns, worst * 1e6, period * 1e6, load * 100);
    close(pcm); close(surf.fd);
    for (MidiPort& p : ext) close(p.fd);
    return 0;
}
