# Assets (Images & Icons) for React Frontend

This app replicates the PHP frontend. To get the same look (logos, landing hero, etc.), copy the following files from your PHP project into `React-frontend/public/images/`.

## From PHP project root / assets

| Copy from (PHP project) | Put in React `public/images/` | Used in |
|-------------------------|-------------------------------|--------|
| `assets/images/swifterz_login.jpeg` | `swifterz_login.jpeg` | Login page header |
| `assets/images/swifterz_logo.jpeg`   | `swifterz_logo.jpeg`   | Sidebar logo |
| `assets/images/Jiffy-logo2.png`      | `Jiffy-logo2.png`      | Optional: forgot/OTP/reset steps |
| `assets/images/swift_jiffy_favicon.jpeg` | (use as favicon in `index.html`) | Browser tab icon |

## From PHP landing (root index / assets2)

| Copy from (PHP project) | Put in React `public/images/` | Used in |
|-------------------------|-------------------------------|--------|
| `assets2/img/hero-img.png`   | `hero-img.png`   | Landing hero section |
| `assets2/img/AboutUs.png`    | `AboutUs.png`    | Landing about section |
| `assets2/img/features/*.png` | `features/*.png` | Optional: feature cards (task.png, project.png, etc.) |

## Favicon

In `React-frontend/index.html`, set:

```html
<link rel="icon" href="/images/swift_jiffy_favicon.jpeg" />
```

(or copy `assets/images/swift_jiffy_favicon.jpeg` to `public/images/` and use the path above).

## Icons

The React app uses **inline SVGs** for all UI icons (sidebar, topbar, buttons) so no icon fonts (Font Awesome, Remix Icon, etc.) are required. The sidebar “Let’s Connect Through” section uses SVG icons for Teams, Twitter, Instagram, Youtube, and WhatsApp.

## If you don’t copy assets

- **Login**: A “SwiftBIM” text placeholder is shown if the logo image fails to load.
- **Sidebar**: “SwiftBIM” text is shown if the logo image fails to load.
- **Landing**: Hero and About sections show a gradient placeholder and/or text if images are missing.

All paths are relative to `public/`, e.g. `src="/images/swifterz_logo.jpeg"` loads `public/images/swifterz_logo.jpeg`.
