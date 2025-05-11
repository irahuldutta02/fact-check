# Fact Check AI - Powered by Google Gemini

A modern web application that verifies facts using Google's Gemini AI. Built with Next.js App Router and Tailwind CSS.

## Features

- Clean, modern UI with a custom color palette
- Statement verification using Google Gemini AI
- Detailed analysis and verdict (True, False, or Partially True)
- Source citations with clickable links
- Dark mode / Light mode toggle
- Trending topics suggestions
- Save favorite fact checks
- Share results on social media
- Search history
- Copy results to clipboard
- Feedback functionality
- Responsive design for all device sizes

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [Google Generative AI SDK](https://ai.google.dev/docs/gemini_api)
- [React Icons](https://react-icons.github.io/react-icons/)

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- Google Gemini API key ([Get one here](https://ai.google.dev/))

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/fact-check-ai.git
   cd fact-check-ai
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Google Gemini API key

   ```
   GOOGLE_GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser

## Usage

1. Enter a statement you want to verify in the text area
2. Click the "Verify with AI" button
3. Wait for the AI to analyze the statement
4. View the verdict, detailed explanation, and sources

## Deployment

This application can be deployed on [Vercel](https://vercel.com/), the platform built by the creators of Next.js.

```bash
npm run build
vercel
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for the powerful fact-checking capabilities
- Next.js team for the excellent framework
- Tailwind CSS for the utility-first CSS framework
