# Mark1 Blocks IDE

A visual block-programming IDE for the Mark1 robot (Arduino Nano).
Drag blocks → see live Arduino code → upload in one click.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10+ | https://python.org |
| Node.js | 18+ | https://nodejs.org |
| arduino-cli | latest | https://arduino.github.io/arduino-cli/ |

### Install arduino-cli (quick)
```bash
# macOS (Homebrew)
brew install arduino-cli

# Windows (winget)
winget install ArduinoSA.CLI

# Linux
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh
```

After installing, add Arduino AVR core:
```bash
arduino-cli core update-index
arduino-cli core install arduino:avr
```

---

## Setup

### 1. Clone / download the project
```bash
git clone <your-repo-url>
cd mark1-blocks
```

### 2. Install Python dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

---

## Running

### Development mode (hot-reload)
```bash
# Terminal 1 — backend
python start.py

# Terminal 2 — frontend dev server
cd frontend && npm run dev
```
Open http://localhost:5173

### Production mode (single server)
```bash
cd frontend && npm run build && cd ..
python start.py
```
Opens http://localhost:5000 automatically.

---

## Project Structure

```
mark1-blocks/
├── backend/
│   ├── app.py          ← Flask server (3 API routes)
│   ├── uploader.py     ← arduino-cli wrapper
│   ├── boards.py       ← board list (add new boards here)
│   ├── config.py       ← all configuration (paths, ports, etc.)
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── blocks/
│       │   ├── index.js     ← registers all block plugins
│       │   ├── mark1.js     ← Mark1 block definitions
│       │   └── toolbox.xml  ← which blocks appear in sidebar
│       ├── components/      ← React UI components
│       ├── hooks/
│       │   └── useProjects.js  ← all localStorage logic
│       ├── api/
│       │   └── arduino.js   ← all backend API calls
│       ├── theme/
│       │   └── tokens.js    ← ALL colors and fonts (edit here)
│       └── App.jsx
│
├── start.py            ← single entry point
└── README.md
```

---

## Adding a New Robot Library

1. Create `frontend/src/blocks/myrobot.js`:
```js
export function defineBlocks(Blockly) {
  Blockly.Blocks["myrobot_action"] = {
    init() {
      this.appendDummyInput().appendField("Do something");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour("#AA00FF");
    }
  };
  Blockly.Arduino["myrobot_action"] = () => `myRobot.doSomething();\n`;
}
```

2. Add one line to `frontend/src/blocks/index.js`:
```js
import { defineBlocks as defineMyRobot } from "./myrobot.js";
// inside registerAllBlocks():
defineMyRobot(Blockly);
```

3. Add a `<category>` to `frontend/src/blocks/toolbox.xml`. Done.

---

## Adding a New Board

Open `backend/boards.py` and add to the `BOARDS` list:
```python
{
    "name": "My Custom Board",
    "fqbn": "vendor:arch:board",
    "group": "Custom",
},
```

---

## Changing Colors / Fonts

Open `frontend/src/theme/tokens.js` — every color and font is defined there.
Change it once and it cascades everywhere.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check backend is running |
| `/api/ports` | GET | List available serial ports |
| `/api/boards` | GET | List supported boards |
| `/api/cli-status` | GET | Check arduino-cli availability |
| `/api/upload` | POST | Compile + upload sketch |

---

## Troubleshooting

**"arduino-cli not found"**
→ Install arduino-cli and make sure it's on your PATH.
→ Or set `ARDUINO_CLI_PATH=/full/path/to/arduino-cli` environment variable.

**"No ports found"**
→ Connect your Arduino, click the 🔄 refresh button.
→ On Linux: `sudo usermod -aG dialout $USER` then log out/in.

**Blockly not loading**
→ Check internet connection (Blockly loads from CDN in dev mode).
→ Run `npm run build` to bundle everything locally for offline use.
