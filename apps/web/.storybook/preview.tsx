import React from 'react'
import type { Preview } from '@storybook/nextjs-vite'
import '../src/app/globals.css'
import { I18nProvider } from '../src/lib/i18n'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#18181b' },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.backgrounds?.value === '#18181b';
      return (
        <I18nProvider>
          <div className={isDark ? 'dark' : ''}>
            <div className="bg-background text-foreground p-4">
              <Story />
            </div>
          </div>
        </I18nProvider>
      );
    },
  ],
};

export default preview;