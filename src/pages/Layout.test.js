import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

const renderAt = (path) => render(
    <MemoryRouter initialEntries={[path]}>
        <Layout />
    </MemoryRouter>
);

test('titles the example dropdown after the current route', () => {
    renderAt('/exampleVts');
    expect(screen.getByRole('button', { name: 'Vector Tiles' })).toBeInTheDocument();
});

test('falls back to "Select Example" for routes without a label', () => {
    renderAt('/');
    expect(screen.getByRole('button', { name: 'Select Example' })).toBeInTheDocument();
});
