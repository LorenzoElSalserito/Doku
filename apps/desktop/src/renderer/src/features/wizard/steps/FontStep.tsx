import { DOKU_FONT_CATALOG, type DokuFontFamily } from '@doku/application';
import { useDict } from '../../../i18n/I18nProvider.js';

interface FontStepProps {
  value: DokuFontFamily;
  onChange: (value: DokuFontFamily) => void;
}

export function FontStep({ value, onChange }: FontStepProps) {
  const dict = useDict();

  return (
    <div className="font-step">
      <div className="font-choice-grid" role="radiogroup" aria-label={dict.wizard.font.title}>
        {DOKU_FONT_CATALOG.map((font) => {
          const selected = font.family === value;
          return (
            <label
              key={font.family}
              className="font-choice"
              data-selected={selected ? 'true' : 'false'}
              style={{ fontFamily: font.family }}
            >
              <input
                type="radio"
                name="wizard-font-family"
                value={font.family}
                checked={selected}
                onChange={() => onChange(font.family)}
              />
              <span className="font-choice__meta">
                <span className="font-choice__family">{font.family}</span>
                <span className="font-choice__category">{font.recommendedUse}</span>
              </span>
              <span className="font-choice__preview">{font.previewText}</span>
            </label>
          );
        })}
      </div>
      <div className="font-step__preview" style={{ fontFamily: value }} aria-live="polite">
        <span className="font-step__preview-label">{dict.wizard.font.previewLabel}</span>
        <p>{dict.wizard.font.sampleText}</p>
      </div>
    </div>
  );
}
