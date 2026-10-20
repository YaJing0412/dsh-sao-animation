import cv2, os, glob, base64, json, pathlib
d = pathlib.Path(r"C:\Users\Administrator\Documents\deepseek-harness\default-workspace\dsh-boot")
fixed = sorted(glob.glob(os.environ['TEMP'] + r"\bladefix12\s*.png"))
frames_dir = pathlib.Path(os.environ['TEMP']) / "frames"
N = 24
picked = [fixed[round(i * (len(fixed)-1) / (N-1))] for i in range(N)]
assert len(picked) == N

# 1) drop the imported clip into the timeline slots (frames 132..155 = t 4400..5167)
for i, src in enumerate(picked):
    im = cv2.imread(src)
    cv2.imwrite(str(frames_dir / f"f{132+i:04d}.png"), im)

# 2) same frames as WebP data URIs for the single-file HTML
uris = []
for src in picked:
    im = cv2.imread(src)
    ok, buf = cv2.imencode(".webp", im, [cv2.IMWRITE_WEBP_QUALITY, 82])
    assert ok
    uris.append("data:image/webp;base64," + base64.b64encode(buf.tobytes()).decode("ascii"))
(d / "blades.json").write_text(json.dumps(uris), encoding="utf-8")
print("slots written:", N, "| webp total KB:", round(sum(len(u) for u in uris)/1024, 0))



