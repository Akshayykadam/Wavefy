# CastBee — Where Stories Buzz 🐝

CastBee is a modern, open-source podcast player built with **React Native** and **Expo**. It offers a premium listening experience with offline support, sleek UI, and robust state management.

## 🚀 Features

*   **🎧 Full Featured Player**: Play, pause, seek, background audio support, and solid controls.
*   **⏱️ Sleep Timer**: Fall asleep to your favorite stories with a built-in timer (15m, 30m, 45m, 60m).
*   **⏩ Smart Playback**: Granular speed control (0.5x - 2.0x) with high-quality pitch correction (no chipmunk voices!).
*   **⬇️ Offline Mode**: Download episodes to your device and listen without an internet connection. The app automatically prioritizes local files.
*   **❤️ Favorites & Queue**: Like episodes to save them for later or build a custom playback queue.
*   **🔔 Follow Podcasts**: Subscribe to your favorite shows and stay updated.
*   **🎨 Premium UI**: Dark-mode first design with fluid animations, intuitive gestures, and a slick player interface.

## 🛠 Tech Stack

*   **Framework**: [Expo SDK 54](https://expo.dev) + React Native
*   **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Data Fetching**: [TanStack Query](https://tanstack.com/query/latest)
*   **Audio**: `expo-audio` (New module)
*   **Persistence**: `@react-native-async-storage/async-storage` & `expo-file-system`
*   **Styling**: React Native StyleSheet + `lucide-react-native` icons

## 🏃‍♂️ Getting Started

### Prerequisites

*   Node.js (LTS recommended)
*   [Expo Go](https://expo.dev/client) app on your iOS/Android device OR an Android Emulator/iOS Simulator.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/yourusername/castbee.git
    cd castbee
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Start the development server:**

    ```bash
    npx expo start
    ```

4.  **Run the app:**
    *   Scan the QR code with your phone (using Camera on iOS or Expo Go on Android).
    *   Press `a` to run on Android Emulator.
    *   Press `i` to run on iOS Simulator.

## 📱 Building the APK (Android)

To build a production APK for Android:

```bash
# Install EAS CLI if you haven't
npm install -g eas-cli

# Login to Expo
eas login

# Build
eas build --platform android --profile production
```

## 🤝 Contributing

This project is open source and free to use! Contributions are welcome.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ by Akshay Kadam
