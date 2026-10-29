#!/bin/sh
# BLONDA AKAI — talk to an MPC Sample over USB (needs the temporary root SSH kit on its SD card, see Akai/README.md).
#
#   ./mpc.sh check        is the MPC reachable? prints firmware and CPU info
#   ./mpc.sh selftest     copy the binary to RAM and run its self test (the stock app keeps running, no sound)
#   ./mpc.sh run          copy the binary to RAM and start it instead of the stock app (SHIFT + STOP quits)
#   ./mpc.sh stop         stop it now (the stock app starts again by itself)
#   ./mpc.sh log          follow its output
#
# Nothing is written to the MPC's flash: the binary lives in /run (RAM) and is gone after a reboot.
set -eu
cd "$(dirname "$0")/../.."
KEY=${MPC_KEY:-"$HOME/.ssh/mpc_sample_client_ed25519"}
BIN=${BIN:-build-mpcsample/blonda-akai}
ssh_mpc() { ssh -p 2222 -i "$KEY" -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new root@192.168.155.1 "$@"; }
push() {
  [ -f "$BIN" ] || { echo "no $BIN yet: run platform/mpcsample/build.sh first (or download it from GitHub Actions)"; exit 1; }
  ssh_mpc 'cat > /run/blonda-akai.new && chmod 700 /run/blonda-akai.new && mv /run/blonda-akai.new /run/blonda-akai' < "$BIN"
  echo "copied $(wc -c < "$BIN") bytes to /run/blonda-akai"
}
case "${1:-}" in
  check)    ssh_mpc 'uname -a; cat /proc/cpuinfo | grep -m1 -i "cpu part\|model name" || true; nproc; free -m | head -2; systemctl is-active ac50.service' ;;
  selftest) push; ssh_mpc 'nice -n 10 /run/blonda-akai --selftest' ;;
  run)      push
            ssh_mpc 'systemctl stop blonda-akai.service 2>/dev/null || true; systemd-run --unit=blonda-akai --collect -p RuntimeMaxSec=3600 -p ExecStartPre="/usr/bin/systemctl stop ac50.service" -p ExecStopPost="/usr/bin/systemctl start ac50.service" /run/blonda-akai'
            echo "running. Quit on the MPC with SHIFT + STOP, or ./mpc.sh stop. Output: ./mpc.sh log" ;;
  stop)     ssh_mpc 'systemctl stop blonda-akai.service' ;;
  log)      ssh_mpc 'journalctl -u blonda-akai -f -n 50' ;;
  *)        sed -n '2,10p' "$0"; exit 1 ;;
esac
