from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"


def make(size: int, path: str) -> None:
    image = Image.new("RGB", (size, size), "#1b3a4b")
    draw = ImageDraw.Draw(image)
    margin = int(size * 0.12)
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=int(size * 0.16),
        fill="#fffdf8",
    )
    font = ImageFont.truetype(FONT, int(size * 0.46))
    text = "稅"
    box = draw.textbbox((0, 0), text, font=font)
    width = box[2] - box[0]
    height = box[3] - box[1]
    draw.text(
        ((size - width) / 2 - box[0], (size - height) / 2 - box[1] - size * 0.03),
        text,
        font=font,
        fill="#e25b2a",
    )
    image.save(path, "PNG")


make(180, "public/apple-touch-icon.png")
make(192, "public/icon-192.png")
make(512, "public/icon-512.png")
