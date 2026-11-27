# Dev: frames + CDP timestamps -> constant-30fps mp4 via ffmpeg concat with real durations.
import json, sys, subprocess, os
d = sys.argv[1]; out = sys.argv[2]
t = json.load(open(os.path.join(d, 'times.json')))
lines = []
for i in range(len(t)):
    dur = (t[i+1] - t[i]) if i + 1 < len(t) else 0.5
    lines.append(f"file '{d}/{i:05d}.jpg'\nduration {max(dur, 0.001):.4f}")
lines.append(f"file '{d}/{len(t)-1:05d}.jpg'")
open(os.path.join(d, 'list.txt'), 'w').write('\n'.join(lines) + '\n')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(d, 'list.txt'), '-vf', 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', out], check=True)
print(out)
