// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider.js';
import { AppLoading } from './AppLoading.js';

describe('AppLoading', () => {
  it('renders a branded startup splash while the app is preparing', () => {
    render(
      <I18nProvider language="en">
        <AppLoading />
      </I18nProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Doku');
    expect(screen.getByRole('status')).toHaveTextContent('Preparing your studio');
  });
});
