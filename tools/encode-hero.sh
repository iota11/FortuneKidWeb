#!/usr/bin/env bash
# hero 背景视频的压制脚本。改了素材就重跑这个文件，不要手敲 ffmpeg——
# 每条参数都是为了解决一个具体问题，散落在命令行里迟早会丢。
#
# 用法：  bash tools/encode-hero.sh "/c/Users/Bulisha/Downloads/FK_Website (1)/0903.mp4"
# 产物：  assets/video/hero-{1080,portrait}.{av1.webm,webm,mp4} + 两张 poster
#
# 为什么要出两套分辨率：hero 的 CSS 是 object-fit:cover，390px 竖屏手机会把
# 16:9 画面左右各裁掉一大块——那部分像素编了也看不见，纯浪费码率。竖版单独裁一份，
# 手机的文件更小、看起来反而更清楚。选哪一套由 js/hero-video.js 的 matchMedia 决定，
# 不能写 <source media="...">：那个属性在 <video> 里早就被浏览器废掉了（只有 <picture> 认）。
set -euo pipefail

SRC="${1:?用法: bash tools/encode-hero.sh <源视频路径>}"
FFDIR="/c/Users/Bulisha/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin"
FFMPEG="$FFDIR/ffmpeg"
OUT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/assets/video"
mkdir -p "$OUT"

# 竖版的裁法：1080 高对应 9:16 的宽是 607.5，取偶数 608（编码器只吃偶数）。
# 想让主体偏左/偏右，把 crop 的第三个参数（x 起点）从 (iw-608)/2 改掉。
CROP_V="crop=608:1080:(iw-608)/2:0,scale=720:1280:flags=lanczos"
SCALE_H="scale=1920:1080:flags=lanczos"

# 所有输出统一：
#   -an           丢掉音轨（背景视频永远静音，源里那条 2kbps 的 AAC 是白占字节）
#   -g 60         每两秒一个关键帧（循环回到 0 秒时要有 I 帧，不然接缝处会糊一下）
#   -map_metadata -1  清掉源文件的创建时间等元数据，不要带进公开仓库
#   bt709 三件套  WebM 容器不像 MP4 那样自带色彩标签，不写死的话有些浏览器会按 bt601
#                 猜矩阵，颜色会整体偏一点——源就是 bt709，照抄过去
COMMON=(-an -g 60 -map_metadata -1
        -color_primaries bt709 -color_trc bt709 -colorspace bt709)

# 三个编码器的 CRF 不是拍脑袋定的，是拿 libvmaf 跟源比出来的（对齐时间戳要用
# settb=AVTB,setpts=N/30/TB，否则 WebM 的时间戳抖动会让它比错帧，分数卡在 91 上不去，
# 看着像"编码器不行"，其实是量错了）。三条都落在 VMAF ≈ 95，也就是背景视频这个用途上
# 肉眼跟源分不出来的位置：
#     AV1  crf 18 → 2.04 MB / 94.94
#     VP9  crf 24 → 2.84 MB / 95.12
#     H264 crf 20 → 5.01 MB / 94.57
# 同样的画质 AV1 只要 H.264 四成的体积——这就是为什么它排在 <source> 第一位。
CRF_AV1=18
CRF_VP9=24
CRF_H264=20

# --- 1. AV1：给 Chrome / Firefox / Edge 的主力，约占访问量的四分之三 ---
# 10bit 不是为了"色彩更好"，是为了消 banding：天空、光晕这种大片渐变在 8bit 低码率下
# 一定会断成台阶，多两位精度正好花在这里。AV1 的硬解基本都带 10bit Main，
# 不像 VP9 profile 2 那样容易掉回软解烧电。
# 装在 webm 里而不是 mp4：Safari 对 AV1-in-WebM 支持不明朗，让它老实落到下面的 H.264 就行。
enc_av1() {  # $1=滤镜  $2=输出名
  "$FFMPEG" -y -v error -i "$SRC" "${COMMON[@]}" -vf "$1" \
    -c:v libsvtav1 -pix_fmt yuv420p10le -crf "$CRF_AV1" -preset 4 \
    -svtav1-params "tune=0" \
    "$OUT/$2"
}

# --- 2. VP9：老 Chrome/Firefox 和 Safari 14.1+ 的中间档 ---
# 这里保持 8bit。VP9 的 10bit（profile 2）硬解覆盖差，移动端掉软解得不偿失，
# 消 banding 的活交给上面的 AV1 和 CSS 那层颗粒去做。
enc_vp9() {
  "$FFMPEG" -y -v error -i "$SRC" "${COMMON[@]}" -vf "$1" \
    -c:v libvpx-vp9 -pix_fmt yuv420p -crf "$CRF_VP9" -b:v 0 \
    -row-mt 1 -tile-columns 2 -deadline good -cpu-used 1 \
    "$OUT/$2"
}

# --- 3. H.264：Safari 和所有兜底路径，必须能放 ---
# x264-params 那串是"别把纹理抹平"：aq-mode=3 把码率往暗部和平坦区赶，
# psy-rd 让编码器宁可留噪点也不要糊成一块，deblock 调负是少去一点方块滤波。
# 三条合起来就是 -tune grain 的温和版——直接上 -tune grain 会把体积顶上去太多。
# profile high + yuv420p：iOS 的硬解只认这套，换 10bit 或 4:2:2 都是黑屏。
# +faststart 把索引搬到文件头，浏览器不用等整个文件下完就能开播。
enc_h264() {
  "$FFMPEG" -y -v error -i "$SRC" "${COMMON[@]}" -vf "$1" \
    -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
    -crf "$CRF_H264" -preset slower \
    -x264-params "aq-mode=3:aq-strength=0.9:psy-rd=1.0,0.15:deblock=-1,-1:ref=5:bframes=5" \
    -movflags +faststart \
    "$OUT/$2"
}

# --- 4. poster：取第 0 帧，不是随便一帧 ---
# 必须和视频的第一帧一模一样，否则视频解码出来的瞬间画面会跳一下。
# 用 WebP 不用 AVIF：AVIF 更小，但 <video poster> 只能给一个 URL、没有 <picture> 那种降级，
# Safari 16.4 以下拿不到就直接白板。WebP 覆盖率 98%+，换来的几十 KB 不值得冒这个险。
poster() {
  "$FFMPEG" -y -v error -i "$SRC" -frames:v 1 -vf "$1" \
    -c:v libwebp -quality 82 -compression_level 6 "$OUT/$2"
}

echo "→ 横版 1920x1080"
enc_av1  "$SCALE_H" "hero-1080.av1.webm"
enc_vp9  "$SCALE_H" "hero-1080.webm"
enc_h264 "$SCALE_H" "hero-1080.mp4"
poster   "$SCALE_H" "hero-poster.webp"

echo "→ 竖版 720x1280"
enc_av1  "$CROP_V" "hero-portrait.av1.webm"
enc_vp9  "$CROP_V" "hero-portrait.webm"
enc_h264 "$CROP_V" "hero-portrait.mp4"
poster   "$CROP_V" "hero-poster-portrait.webp"

echo
echo "=== 产物 ==="
ls -la "$OUT" | grep -E "hero-(1080|portrait|poster)" | awk '{printf "%-32s %8.2f MB\n", $9, $5/1048576}'
