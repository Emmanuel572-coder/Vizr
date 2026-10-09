import os
import struct
import zlib
import math
import subprocess

SVG_CONTENT = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
  <defs>
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
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
    </linearGradient>
  </defs>

  <!-- Centered 3D Rising Bar Chart Icon -->
  <g transform="translate(6, 4)">
    <!-- Bar 1: Lowest (x=28, y=144, w=40, h=80) -->
    <rect x="28" y="144" width="40" height="80" rx="10" fill="url(#vzBar1)"/>

    <!-- Bar 2: Medium-low (x=72, y=104, w=40, h=120) -->
    <rect x="72" y="104" width="40" height="120" rx="10" fill="url(#vzBar2)"/>

    <!-- Bar 3: Medium-high (x=116, y=64, w=40, h=160) -->
    <rect x="116" y="64" width="40" height="160" rx="10" fill="url(#vzBar3)"/>

    <!-- Bar 4: Tallest (x=160, y=24, w=44, h=200) -->
    <rect x="160" y="24" width="44" height="200" rx="10" fill="url(#vzBar4)"/>

    <!-- 3D Depth Isometric Right Wall on Bar 4 -->
    <path d="M 204,34 L 218,48 L 218,214 L 204,224 Z" fill="url(#vzBar4Side)"/>

    <!-- Diagonal isometric depth slice across bars 1, 2, 3 -->
    <path d="M 28,190 L 160,112 L 160,224 L 28,224 Z" fill="url(#vzDiagShadow)"/>

    <!-- Isometric angled base plane at bottom -->
    <path d="M 28,224 L 204,224 L 218,214 L 186,234 L 42,234 Z" fill="url(#vzBottomBase)"/>

    <!-- Pill cap highlights for 3D glassy shine -->
    <path d="M 29,153 C 29,146 34,145 48,145 C 62,145 67,146 67,153 C 67,149 62,147 48,147 C 34,147 29,149 29,153 Z" fill="url(#capGlow)"/>
    <path d="M 73,113 C 73,106 78,105 92,105 C 106,105 111,106 111,113 C 111,109 106,107 92,107 C 78,107 73,109 73,113 Z" fill="url(#capGlow)"/>
    <path d="M 117,73 C 117,66 122,65 136,65 C 150,65 155,66 155,73 C 155,69 150,67 136,67 C 122,67 117,69 117,73 Z" fill="url(#capGlow)"/>
    <path d="M 161,33 C 161,26 167,25 182,25 C 197,25 203,26 203,33 C 203,29 197,27 182,27 C 167,27 161,29 161,33 Z" fill="url(#capGlow)"/>
  </g>
</svg>"""

def make_png(width, height, rgba_data):
    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    raw = b''.join(b'\x00' + rgba_data[y * width * 4:(y + 1) * width * 4] for y in range(height))
    compressed = zlib.compress(raw, 9)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

def render_icon_png(size):
    W, H = size, size
    scale = size / 256.0
    pixels = bytearray(W * H * 4)

    def blend(px, py, r, g, b, a):
        if 0 <= px < W and 0 <= py < H and a > 0:
            idx = (py * W + px) * 4
            old_a = pixels[idx + 3] / 255.0
            new_a = a / 255.0
            out_a = new_a + old_a * (1.0 - new_a)
            if out_a > 0:
                pixels[idx] = int((r * new_a + pixels[idx] * old_a * (1.0 - new_a)) / out_a)
                pixels[idx + 1] = int((g * new_a + pixels[idx + 1] * old_a * (1.0 - new_a)) / out_a)
                pixels[idx + 2] = int((b * new_a + pixels[idx + 2] * old_a * (1.0 - new_a)) / out_a)
                pixels[idx + 3] = int(out_a * 255)

    def draw_round_rect(x1, y1, x2, y2, rad, color_top, color_bot, alpha):
        # Coordinates in 256 space, transformed to pixel space
        px1, py1 = (x1 + 6) * scale, (y1 + 4) * scale
        px2, py2 = (x2 + 6) * scale, (y2 + 4) * scale
        prad = rad * scale
        min_x, max_x = max(0, int(px1)), min(W - 1, int(px2) + 1)
        min_y, max_y = max(0, int(py1)), min(H - 1, int(py2) + 1)

        for py in range(min_y, max_y + 1):
            t_y = (py - py1) / max(1, py2 - py1)
            t_y = max(0.0, min(1.0, t_y))
            r = int(color_top[0] * (1 - t_y) + color_bot[0] * t_y)
            g = int(color_top[1] * (1 - t_y) + color_bot[1] * t_y)
            b = int(color_top[2] * (1 - t_y) + color_bot[2] * t_y)
            for px in range(min_x, max_x + 1):
                # Distance to rounded rect corners
                dx = max(0.0, px1 + prad - px, px - (px2 - prad))
                dy = max(0.0, py1 + prad - py, py - (py2 - prad))
                if dx > 0 and dy > 0:
                    dist = math.sqrt(dx * dx + dy * dy)
                    if dist > prad + 0.8:
                        continue
                    coverage = max(0.0, min(1.0, prad + 0.5 - dist))
                elif px1 <= px <= px2 and py1 <= py <= py2:
                    coverage = 1.0
                else:
                    coverage = 0.0

                if coverage > 0:
                    blend(px, py, r, g, b, int(alpha * coverage))

    # Bar 1 (Lowest)
    draw_round_rect(28, 144, 68, 224, 10, (37, 99, 235), (15, 23, 42), 240)
    # Bar 2 (Mid-low)
    draw_round_rect(72, 104, 112, 224, 10, (59, 130, 246), (23, 37, 84), 235)
    # Bar 3 (Mid-high)
    draw_round_rect(116, 64, 156, 224, 10, (96, 165, 250), (29, 78, 216), 245)
    # Bar 4 (Tallest)
    draw_round_rect(160, 24, 204, 224, 10, (59, 130, 246), (29, 78, 216), 255)

    # 3D Depth Isometric Right Wall on Bar 4
    for py in range(int((24 + 4) * scale), int((224 + 4) * scale)):
        t_y = (py - 28 * scale) / (200 * scale)
        r = int(29 * (1 - t_y) + 23 * t_y)
        g = int(78 * (1 - t_y) + 37 * t_y)
        b = int(216 * (1 - t_y) + 84 * t_y)
        x_left = int((204 + 6) * scale)
        x_right = int((218 + 6) * scale)
        for px in range(x_left, x_right + 1):
            blend(px, py, r, g, b, 250)

    # Diagonal isometric depth shadow facet across lower portion
    # Polygon (28, 190) -> (160, 112) -> (160, 224) -> (28, 224)
    for py in range(int((112 + 4) * scale), int((224 + 4) * scale)):
        t_span = (py - (112 + 4) * scale) / ((224 - 112) * scale)
        x_left = (160 + 6) * scale - t_span * (160 - 28) * scale
        x_right = (160 + 6) * scale
        for px in range(max(0, int(x_left)), min(W - 1, int(x_right) + 1)):
            blend(px, py, 10, 26, 68, 195)

    # Isometric angled bottom plane
    for py in range(int((214 + 4) * scale), int((234 + 4) * scale)):
        for px in range(int((34 + 6) * scale), int((210 + 6) * scale)):
            blend(px, py, 13, 31, 77, 210)

    # Glassy pill highlights
    for bar_x, bar_y in [(28, 144), (72, 104), (116, 64), (160, 24)]:
        cx = int((bar_x + 20 + 6) * scale)
        cy = int((bar_y + 8 + 4) * scale)
        rad_x = int(14 * scale)
        rad_y = max(1, int(4 * scale))
        for dy in range(-rad_y, rad_y + 1):
            for dx in range(-rad_x, rad_x + 1):
                if (dx / max(1, rad_x)) ** 2 + (dy / max(1, rad_y)) ** 2 <= 1.0:
                    blend(cx + dx, cy + dy, 255, 255, 255, 140)

    return make_png(W, H, bytes(pixels))

os.makedirs('public', exist_ok=True)

# 1. Write SVG
with open('public/favicon.svg', 'w') as f:
    f.write(SVG_CONTENT)
print('Wrote public/favicon.svg')

# 2. Write 192x192 PNG
png_192 = render_icon_png(192)
with open('public/favicon.png', 'w') as f:
    f.write(png_192)
print('Wrote public/favicon.png (192x192)')

# 3. Write Apple Touch Icon (180x180)
png_180 = render_icon_png(180)
with open('public/apple-touch-icon.png', 'w') as f:
    f.write(png_180)
print('Wrote public/apple-touch-icon.png (180x180)')

# 4. Write 32x32 PNG
png_32 = render_icon_png(32)
with open('public/favicon-32x32.png', 'w') as f:
    f.write(png_32)
print('Wrote public/favicon-32x32.png (32x32)')

# 5. Convert to favicon.ico using convert
try:
    subprocess.run(['convert', 'public/favicon-32x32.png', 'public/favicon.ico'], check=True)
    print('Wrote public/favicon.ico')
except Exception as e:
    print('Could not generate ico via convert:', e)
