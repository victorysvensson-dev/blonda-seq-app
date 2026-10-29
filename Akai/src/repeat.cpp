#include "akai/repeat.hpp"

namespace akai {

namespace {
const char* const kModes[] = {"REPEAT", "ARP UP", "ARP DOWN", "ARP UP/DN", "ARP ORDER", "ARP RANDOM"};
const char* const kRates[] = {"1/4", "1/8", "1/8T", "1/16", "1/16T", "1/32"};
const double kBeats[] = {1.0, 0.5, 1.0 / 3.0, 0.25, 1.0 / 6.0, 0.125};
} // namespace

const char* Repeater::modeName(int m) { return (m >= 0 && m < kNumModes) ? kModes[m] : ""; }
const char* Repeater::rateName(int r) { return (r >= 0 && r < kNumRates) ? kRates[r] : ""; }
double Repeater::stepLen() const { return (double)sr_ * 60.0 / bpm_ * kBeats[rate_]; }

void Repeater::add(int note, float velocity) {
    if (find(note) >= 0 || n_ >= 16) return;
    src_[n_++] = {note, velocity, 0.f, orderCount_++};
    if (!running_) { running_ = true; untilStep_ = 0; sinceStep_ = 0; idx_ = 0; lastArp_ = -1; }   // first note: the grid starts now
    else if (mode_ == Repeat && untilStep_ > 0 && pending_ < 16) pend_[pending_++] = note;   // (a step due now plays it anyway)
}

void Repeater::remove(int note) {
    const int k = find(note);
    if (k < 0) return;
    for (int i = k; i + 1 < n_; ++i) src_[i] = src_[i + 1];
    --n_;
    for (int i = 0; i < pending_; ++i) if (pend_[i] == note) { pend_[i] = pend_[--pending_]; break; }
}

void Repeater::setPressure(int note, float pressure) {
    const int k = find(note);
    if (k >= 0) src_[k].press = pressure < 0.f ? 0.f : (pressure > 1.f ? 1.f : pressure);
}

void Repeater::clear() { n_ = 0; pending_ = 0; running_ = false; idx_ = 0; lastArp_ = -1; }

// index into src_ of the next arpeggio note
int Repeater::arpNote() {
    int ord[16]; const int n = n_;
    for (int i = 0; i < n; ++i) ord[i] = i;
    auto byPitch = [&](bool up) { for (int i = 1; i < n; ++i) for (int j = i; j > 0; --j) {
        const bool sw = up ? src_[ord[j]].note < src_[ord[j - 1]].note : src_[ord[j]].note > src_[ord[j - 1]].note;
        if (!sw) break; const int t = ord[j]; ord[j] = ord[j - 1]; ord[j - 1] = t; } };
    int seq[32]; int len = 0;
    switch (mode_) {
    case Up: byPitch(true); for (int i = 0; i < n; ++i) seq[len++] = ord[i]; break;
    case Down: byPitch(false); for (int i = 0; i < n; ++i) seq[len++] = ord[i]; break;
    case UpDown: byPitch(true); for (int i = 0; i < n; ++i) seq[len++] = ord[i]; for (int i = n - 2; i >= 1; --i) seq[len++] = ord[i]; break;
    case Order: for (int i = 1; i < n; ++i) for (int j = i; j > 0 && src_[ord[j]].order < src_[ord[j - 1]].order; --j) { const int t = ord[j]; ord[j] = ord[j - 1]; ord[j - 1] = t; }
                for (int i = 0; i < n; ++i) seq[len++] = ord[i]; break;
    case Random: {
        rng_ ^= rng_ << 13; rng_ ^= rng_ >> 17; rng_ ^= rng_ << 5;
        int k = (int)(rng_ % (uint32_t)n);
        if (n > 1 && src_[k].note == lastArp_) k = (k + 1 + (int)((rng_ >> 8) % (uint32_t)(n - 1))) % n;
        lastArp_ = src_[k].note; return k; }
    default: return n ? 0 : -1;
    }
    if (len == 0) return -1;
    const int k = seq[idx_ % len]; ++idx_;
    return k;
}

} // namespace akai
