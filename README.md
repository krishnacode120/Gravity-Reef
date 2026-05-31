# 🌊 Gravity Reef

> A dark-aesthetic browser grid game with gravity physics and Othello-style capture mechanics.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-Apache_2.0-blue)

---

## ✨ Features

- **Gravity-Based Placement** — Spawn pieces on the board edges and watch them slide inward until they collide
- **Othello-Style Capture** — Flank opponent pieces in any of 8 directions to convert them to your color
- **PvP & PvAI Modes** — Challenge a friend or battle an AI opponent with 3 difficulty levels
- **6 Board Layouts** — Classic, Corners, Diamond, Cross, Ring, and Scattered configurations
- **Move History & Undo** — Track every move and rewind mistakes (PvP mode)
- **Dark Themes** — Obsidian and High Contrast visual themes with neon glow effects
- **Sound Design** — Web Audio API-powered sound effects and ambient background hum
- **Particle Animations** — Capture bursts, confetti on victory, and smooth spring physics
- **Keyboard Navigation** — Full arrow-key and Enter/Space support for accessible play
- **Interactive Tutorial** — Built-in animated tutorial demonstrating game mechanics

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/krishnacode120/Gravity-Reef.git
cd Gravity-Reef

# Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run preview
```

---

## 🎮 How to Play

1. **Spawn a piece** by clicking any glowing cell on the outer edge of the board
2. **Gravity pulls** your piece inward — it slides until it hits another piece or an anchor block (🔒)
3. **Capture** opponent pieces by flanking them between your piece and another friendly piece (or anchor) in a straight line
4. **Take turns** placing pieces — Player 1 (Cyan) goes first
5. **Win** by controlling the most territory when no more edge cells are available

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript 5.8** | Type safety |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Animations & transitions |
| **Lucide React** | Icon library |
| **Web Audio API** | Sound effects |

---

## 📁 Project Structure

```
Gravity-Reef/
├── index.html            # Entry HTML with SEO meta tags
├── package.json          # Dependencies & scripts
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
├── vercel.json           # Vercel deployment config
├── .env.example          # Environment variable template
└── src/
    ├── main.tsx          # React entry point
    ├── App.tsx           # Root component
    ├── index.css         # Global styles & animations
    ├── types.ts          # TypeScript type definitions
    ├── components/
    │   └── GravityReef.tsx   # Main game component
    └── lib/
        └── audio.ts      # Web Audio sound effects
```

---

## 🌐 Deployment

This project is configured for **Vercel** deployment. Push to `main` and Vercel will automatically build and deploy.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/krishnacode120/Gravity-Reef)

---

## 📄 License

This project is licensed under the [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/krishnacode120">krishnacode120</a>
</p>
