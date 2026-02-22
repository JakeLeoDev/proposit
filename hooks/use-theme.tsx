'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
	const [theme, setTheme] = useState<Theme>('light');
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		// Check localStorage for saved theme preference
		const savedTheme = localStorage.getItem('theme') as Theme | null;
		// Check system preference if no saved theme
		const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		const initialTheme = savedTheme || systemTheme;

		setTheme(initialTheme);
		applyTheme(initialTheme);
	}, []);

	const applyTheme = (newTheme: Theme) => {
		const root = document.documentElement;
		if (newTheme === 'dark') {
			root.classList.add('dark');
		} else {
			root.classList.remove('dark');
		}
	};

	const toggleTheme = () => {
		const newTheme = theme === 'light' ? 'dark' : 'light';
		setTheme(newTheme);
		localStorage.setItem('theme', newTheme);
		applyTheme(newTheme);
	};

	return { theme, toggleTheme, mounted };
}
