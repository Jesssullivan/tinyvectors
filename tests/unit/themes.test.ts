import { describe, expect, it } from 'vitest';
import {
	getThemeCatalog,
	getThemeCatalogEntry,
	getThemePreviewColors,
	getThemeVectorColors,
	getThemePreset,
} from '../../src/themes/index.js';

describe('theme helpers', () => {
	it('returns a vector preset when it exists', () => {
		const preset = getThemePreset('tinyland');

		expect(preset?.name).toBe('tinyland');
		expect(preset?.hasVectors).toBe(true);
	});

	it('returns preview swatches for vector themes', () => {
		expect(getThemePreviewColors('trans')).toEqual([
			'rgba(91, 206, 250, 0.60)',
			'rgba(245, 169, 184, 0.65)',
			'rgba(242, 242, 245, 0.50)',
		]);
	});

	it('returns the richer rendered palette for vector themes', () => {
		expect(getThemeVectorColors('tinyland')).toEqual([
			'rgba(139, 92, 246, 0.55)',
			'rgba(59, 130, 246, 0.55)',
			'rgba(236, 72, 153, 0.50)',
			'rgba(242, 242, 245, 0.45)',
		]);
	});

	it('returns no vector palette for non-vector themes', () => {
		expect(getThemeVectorColors('high-contrast')).toEqual([]);
		expect(getThemePreviewColors('high-contrast')).toEqual([]);
	});

	it('returns package-owned metadata for vector themes', () => {
		expect(getThemeCatalogEntry('tinyland')).toMatchObject({
			name: 'tinyland',
			label: 'Tinyland',
			description: 'Soft violet, blue, and pink glow',
			source: 'tinyvectors',
			hasVectors: true,
		});
	});

	it('returns package-owned metadata for non-vector themes', () => {
		expect(getThemeCatalogEntry('high-contrast')).toMatchObject({
			name: 'high-contrast',
			label: 'High Contrast',
			description: 'WCAG AAA compliant for maximum readability',
			previewColors: ['#000000', '#FFFFFF', '#0040FF'],
			vectorColors: [],
			hasVectors: false,
		});
	});

	it('returns the package theme catalog in display order', () => {
		expect(getThemeCatalog().map((theme) => theme.name)).toEqual([
			'tinyland',
			'trans',
			'pride',
			'high-contrast',
		]);
	});
});
