Standard ShadowPlay is limited to one screen. To record *all* monitors and decide later which one to keep, you have to fundamentally change how the video is composed.

Here is the development summary for your multi-monitor alternative using libOBS.

### **1. The Core Architecture: "The Mega-Canvas"**

The biggest technical hurdle is that consumer NVIDIA cards (GTX/RTX) often have a limit on concurrent encoding sessions (usually 3 to 5). If you try to run 3 separate recorders for 3 monitors, you risk hitting this limit or causing massive lag.

**The Solution:** You will record **one giant video** that contains all monitors, and slice it up later.

  * **Virtual Canvas:** If you have two 1920x1080 monitors, your libOBS instance will set up a base canvas of **3840x1080**.
  * **Compositing:**
      * Source 1 (Monitor 1) goes to coordinates `0,0`.
      * Source 2 (Monitor 2) goes to coordinates `1920,0`.
  * **The Buffer:** The Replay Buffer records this ultra-wide video continuously.

### **2. The Workflow Logic**

Here is the step-by-step logic your application needs to handle when the user presses the "Save Replay" hotkey:

1.  **Trigger:** User presses `Alt + F10`.
2.  **Dump:** LibOBS dumps the last 60 seconds of the "Mega-Canvas" (e.g., the 3840x1080 video) to a temporary folder.
3.  **UI Intercept (Your Unique Feature):**
      * Your app pops up a lightweight window: *"Which screen do you want to save?"* (Options: Monitor 1, Monitor 2, or Both).
4.  **The Crop (FFmpeg Backend):**
      * If the user selects **Monitor 1**: Your app runs a background FFmpeg command to **crop** the left half of the video and save it as the final file.
      * If the user selects **Monitor 2**: Crop the right half.
5.  **Cleanup:** Delete the massive temp file.

### **3. Implementation Roadmap (using libOBS)**

#### **Phase 1: LibOBS Initialization (C++/C\#)**

You need to initialize the `obs-startup` module.

  * **Profile Setup:** Automate the creation of a profile that sets the "Output Mode" to **Replay Buffer**.
  * **Encoder Settings:** Force hardware encoding (`obs_video_encoder_create` using `ffmpeg_nvenc`).
  * **Bitrate Calculation:** This is critical. Since you are recording double/triple the pixels, you need higher bitrate.
      * *Standard 1080p:* 15,000 Kbps.
      * *Dual 1080p (Mega-Canvas):* Set to roughly 30,000–40,000 Kbps to maintain quality.

#### **Phase 2: Dynamic Source Mapping**

Your app needs to detect the user's monitor layout on startup.

  * Use Windows API (`EnumDisplayMonitors`) to get resolution and positions.
  * Map these to `obs_source_create` ("monitor\_capture") instances.
  * Calculate the total width/height and resize the `obs_video_info` base resolution accordingly.

#### **Phase 3: The "Slicing" Engine**

You don't need to re-encode the video to crop it (which takes time and loses quality). You can attempt a stream copy crop, but usually, a fast re-encode is safer for compatibility.

**Example FFmpeg command your app will generate to save just Monitor 2:**

```bash
ffmpeg -i mega_replay.mp4 -filter:v "crop=1920:1080:1920:0" -c:v hevc_nvenc final_clip_monitor2.mp4
```

  * `crop=W:H:X:Y` -\> Width 1920, Height 1080, Start at X position 1920 (the start of the second screen).

### **4. Potential Pitfalls to Watch For**

  * **VRAM Usage:** A 3840x1080 texture buffer is large. If the user is playing a game that uses 99% of their VRAM (like *Cyberpunk 2077*), your recorder might crash or cause stutter. You must add a "Safety Buffer" setting to lower recording resolution if VRAM is tight.
  * **Mixed Refresh Rates:** If Monitor 1 is 144Hz and Monitor 2 is 60Hz, libOBS can sometimes stutter when composing them onto one canvas. You will need to lock the recording framerate to 60FPS to ensure smoothness.
  * **Audio Mapping:** Deciding which audio track goes where.
      * *Simple:* Mix all audio (Game + Discord) into one track.
      * *Advanced:* Record Game Audio to Track 1 and Mic to Track 2, so the user can mute themselves later.

### **5. Next Step**

To start, I recommend looking at **OBS-Studio-Node**. It is a library that allows you to use libOBS with Node.js/Electron. This allows you to write the complicated UI (the "Choose Monitor" popup) in HTML/JS, while the heavy lifting is done by the native OBS bindings.
