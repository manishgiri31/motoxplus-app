#!/usr/bin/env bash
# Regenerates assets/fonts/Inter_*.ttf: Inter subset to the characters the app
# shows (Latin, Latin-1, Latin Extended-A, punctuation, arrows, rupee sign).
# Needs Python fonttools (pip install fonttools) and a source Inter TTF per
# weight, e.g. from https://github.com/rsms/inter/releases (static fonts).
#
#   scripts/subset-fonts.sh path/to/Inter-static-dir
#
# The source dir must contain Inter_400Regular.ttf, Inter_500Medium.ttf,
# Inter_600SemiBold.ttf and Inter_700Bold.ttf.
set -euo pipefail

SRC_DIR="${1:?usage: $0 <dir with Inter_<weight>.ttf files>}"
OUT_DIR="$(dirname "$0")/../assets/fonts"
UNICODES="U+0000-00FF,U+0100-017F,U+0192,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0304,U+0308,U+030C,U+2000-206F,U+20AC,U+20B9,U+2122,U+2190-2199,U+2212,U+2215,U+2713,U+FEFF,U+FFFD"

for w in 400Regular 500Medium 600SemiBold 700Bold; do
  python -m fontTools.subset "$SRC_DIR/Inter_$w.ttf" \
    --unicodes="$UNICODES" \
    --layout-features+=tnum,case,zero,ss01,cv11 \
    --name-IDs='*' \
    --notdef-outline \
    --output-file="$OUT_DIR/Inter_$w.ttf"
done
