# Three.js TypeScript Boilerplate

A simple boilerplate project for getting started with Three.js and TypeScript using Vite.

## Features

- TypeScript support
- Vite for fast development and bundling
- Basic Three.js scene setup with a spinning cube
- Responsive design with window resize handling
- Simple animation example

## Getting Started

### Prerequisites

- Node.js (recommended version 16+)
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
# or
yarn
```

### Development

Start the development server:

```bash
npm run dev
# or
yarn dev
```

This will start a local development server at http://localhost:5173 (or another port if 5173 is in use).

### Building for Production

Build the project for production:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.

## Project Structure

- `src/main.ts` - Entry point for the application
- `src/scene.ts` - Scene setup with camera, renderer, lights and a sample cube
- `src/types.ts` - Type definitions

## License

This project is licensed under the ISC License.