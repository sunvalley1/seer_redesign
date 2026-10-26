import { Head, Html, Main, NextScript } from 'next/document';
import { SEER_THEME_SCRIPT } from '../utils/seerTheme';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{ __html: SEER_THEME_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
