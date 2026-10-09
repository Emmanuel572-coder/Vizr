import os
import struct
import zlib
import math

# Dimensions for icons
# 1. 256x256 SVG
SVG_CONTENT = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
  <defs>
    <!-- Background rounded square badge for maximum contrast on light and dark browser tabs -->
    <linearGradient id="vzBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>

    <!-- Bar 4 Vibrant Gradient (Electric / Royal Blue) -->
    <linearGradient id="vzBar4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="45%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>

    <!-- Bar 4 Isometric Depth Side Wall -->
    <linearGradient id="vzBar4Side" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="50%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#172554"/>
    </linearGradient>

    <!-- Bar 3 Translucent Royal Blue Gradient -->
    <linearGradient id="vzBar3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#3b82f6" stop-opacity="0.90"/>
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.85"/>
    </linearGradient>

    <!-- Bar 2 Translucent Cobalt Gradient -->
    <linearGradient id="vzBar2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.88"/>
      <stop offset="50%" stop-color="#2563eb" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#172554" stop-opacity="0.90"/>
    </linearGradient>

    <!-- Bar 1 (Shortest) Deep Translucent Gradient -->
    <linearGradient id="vzBar1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.80"/>
      <stop offset="50%" stop-color="#1e3a8a" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Diagonal Isometric Shadow Facet -->
    <linearGradient id="vzDiagShadow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#081433" stop-opacity="0.94"/>
      <stop offset="45%" stop-color="#0d2358" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#1e40af" stop-opacity="0.0"/>
    </linearGradient>

    <!-- Angled Bottom Plane -->
    <linearGradient id="vzBottomBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d1f4d"/>
      <stop offset="50%" stop-color="#172554"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>

    <!-- Cap Highlight Glow -->
    <linearGradient id="capGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
    </linearGradient>
  </defs>

  <!-- Optional background badge with rounded corner for crisp browser tab presentation -->
  <rect width="256" height="256" rx="54" fill="url(#vzBg)"/>

  <!-- Centered 3D Rising Bar Chart Icon -->
  <g transform="translate(10, 8)">
    <!-- Bar 1: Lowest (x=24, y=144, w=38, h=78) -->
    <rect x="24" y="144" width="38" height="78" rx="8" fill="url(#vzBar1)"/>

    <!-- Bar 2: Medium-low (x=68, y=104, w=38, h=118) -->
    <rect x="68" y="104" width="38" height="118" rx="8" fill="url(#vzBar2)"/>

    <!-- Bar 3: Medium-high (x=112, y=64, w=38, h=158) -->
    <rect x="112" y="64" width="38" height="158" rx="8" fill="url(#vzBar3)"/>

    <!-- Bar 4: Tallest (x=156, y=24, w=42, h=198) -->
    <rect x="156" y="24" width="42" height="198" rx="8" fill="url(#vzBar4)"/>

    <!-- 3D Depth Isometric Right Wall on Bar 4 -->
    <path d="M 198,34 L 212,48 L 212,212 L 198,222 Z" fill="url(#vzBar4Side)"/>

    <!-- Diagonal isometric depth slice across bars 1, 2, 3 -->
    <path d="M 24,190 L 156,112 L 156,222 L 24,222 Z" fill="url(#vzDiagShadow)"/>

    <!-- Isometric angled base plane at bottom -->
    <path d="M 24,222 L 198,222 L 212,212 L 182,230 L 38,230 Z" fill="url(#vzBottomBase)"/>

    <!-- Pill cap highlights for 3D glassy shine -->
    <path d="M 25,152 C 25,145 30,144 43,144 C 56,144 61,145 61,152 C 61,148 56,146 43,146 C 30,146 25,148 25,152 Z" fill="url(#capGlow)"/>
    <path d="M 69,112 C 69,105 74,104 87,104 C 100,104 105,105 105,112 C 105,108 100,106 87,106 C 74,106 69,108 69,112 Z" fill="url(#capGlow)"/>
    <path d="M 113,72 C 113,65 118,64 131,64 C 144,64 149,65 149,72 C 149,68 144,66 131,66 C 118,66 113,68 113,72 Z" fill="url(#capGlow)"/>
    <path d="M 157,32 C 157,25 162,24 177,24 C 192,24 197,25 197,32 C 197,28 192,26 177,26 C 162,26 157,28 157,32 Z" fill="url(#capGlow)"/>
  </g>
</svg>"""

def create_png_rgba(width, height, get_pixel_rgba):
    # Generates a valid PNG file in bytes
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type: None
        for x in range(width):
            r, g, b, a = get_pixel_rgba(x, y, width, height)
            raw_data.extend([int(r) & 0xff, int(g) & 0xff, int(b) & 0xff, int(a) & 0xff])

    compressed = zlib.compress(bytes(raw_data), 9)

    png = bytearray()
    png.extend(b'\x89PNG\r\n\x1a\n')  # PNG signature

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))

    # IDAT
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))

    # IEND
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))

    return bytes(png)

def render_vizr_pixel(x, y, w, h):
    # Normalized coords [0..1]
    nx = x / float(w)
    ny = y / float(h)

    # Check background rounded rectangle
    radius = 0.22
    # distance to rounded rect boundary
    dx = max(abs(nx - 0.5) - (0.5 - radius), 0)
    dy = max(abs(ny - 0.5) - (0.5 - radius), 0)
    dist_outside = math.sqrt(dx * dx + dy * dy)
    if dist_outside > radius:
        return (0, 0, 0, 0)

    # Base background: deep slate/navy #0f172a to #020617
    bg_t = (nx + ny) * 0.5
    bg_r = int(15 * (1 - bg_t) + 2 * bg_t)
    bg_g = int(23 * (1 - bg_t) + 6 * bg_t)
    bg_b = int(42 * (1 - bg_t) + 23 * bg_t)
    bg_a = 255

    # 4 Rising bars in normalized coordinates:
    # Bar 1: x in [0.12..0.27], y in [0.58..0.88]
    # Bar 2: x in [0.29..0.44], y in [0.43..0.88]
    # Bar 3: x in [0.46..0.61], y in [0.28..0.88]
    # Bar 4: x in [0.63..0.80], y in [0.12..0.88]
    # Bar 4 3D side: x in [0.80..0.87], y in [0.16..0.85]

    # Bar 4 3D depth side facet
    if 0.80 <= nx <= 0.86:
        top_y = 0.12 + (nx - 0.80) * 0.8
        bot_y = 0.88 - (nx - 0.80) * 0.5
        if top_y <= ny <= bot_y:
            return (29, 78, 216, 255) # #1d4ed8 dark royal

    # Bar 1
    if 0.13 <= nx <= 0.27 and 0.58 <= ny <= 0.88:
        t = (ny - 0.58) / 0.30
        return (int(37 * (1 - t) + 15 * t), int(99 * (1 - t) + 23 * t), int(235 * (1 - t) + 138 * t), 255)

    # Bar 2
    if 0.30 <= nx <= 0.44 and 0.43 <= ny <= 0.88:
        t = (ny - 0.43) / 0.45
        return (int(59 * (1 - t) + 23 * t), int(130 * (1 - t) + 37 * t), int(246 * (1 - t) + 180 * t), 255)

    # Bar 3
    if 0.47 <= nx <= 0.61 and 0.28 <= ny <= 0.88:
        t = (ny - 0.28) / 0.60
        return (int(96 * (1 - t) + 29 * t), int(165 * (1 - t) + 78 * t), int(250 * (1 - t) + 216 * t), 255)

    # Bar 4
    if 0.64 <= nx <= 0.80 and 0.12 <= ny <= 0.88:
        t = (ny - 0.12) / 0.76
        # Top cap highlight
        if ny < 0.16:
            return (220, 235, 255, 255)
        return (int(59 * (1 - t) + 29 * t), int(130 * (1 - t) + 78 * t), int(246 * (1 - t) + 216 * t), 255)

    # Angled bottom shadow
    if 0.15 <= nx <= 0.82 and 0.86 <= ny <= 0.91:
        return (13, 31, 77, 230)

    return (bg_r, bg_g, bg_b, bg_a)

os.makedirs('public', exist_ok=True)

# 1. Write public/favicon.svg
with open('public/favicon.svg', 'w') as f:
    f.write(SVG_CONTENT)
print('Wrote public/favicon.svg')

# 2. Write public/favicon-32x32.png
png_32 = create_png_rgba(32, 32, render_vizr_pixel)
with open('public/favicon-32x32.png', 'wb') as f:
    f.write(png_32)
print('Wrote public/favicon-32x32.png')

# 3. Write public/favicon.png (192x192)
png_192 = create_png_rgba(192, 192, render_vizr_pixel)
with open('public/favicon.png', 'wb') as f:
    f.write(png_192)
print('Wrote public/favicon.png')

# 4. Write public/apple-touch-icon.png (180x180)
png_180 = create_png_rgba(180, 180, render_vizr_pixel)
with open('public/apple-touch-icon.png', 'wb') as f:
    f.write(png_180)
print('Wrote public/apple-touch-icon.png')

# 5. Write public/favicon.ico (standard ICO file containing 32x32 PNG)
# ICO header: 6 bytes
# [0..1] reserved (0)
# [2..3] type (1 = icon)
# [4..5] image count (1)
ico_header = struct.pack('<HHH', 0, 1, 1)

# ICO Directory Entry: 16 bytes
# [0] width (32)
# [1] height (32)
# [2] color count (0)
# [3] reserved (0)
# [4..5] color planes (1)
# [6..7] bits per pixel (32)
# [8..11] image size in bytes
# [12..15] image data offset (6 + 16 = 22)
ico_dir = struct.pack('<BBBBHHII', 32, 32, 0, 0, 1, 32, len(png_32), 22)

with open('public/favicon.ico', 'wb') as f:
    f.write(ico_header + ico_dir + png_32)
print('Wrote public/favicon.ico')
