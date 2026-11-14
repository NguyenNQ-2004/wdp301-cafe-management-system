import { lazy, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
const ConnectedApp = lazy(() => import('./ConnectedApp'));
export default function App() { return <BrowserRouter><Suspense fallback={<div className="min-h-screen bg-surface" />}><ConnectedApp /></Suspense></BrowserRouter>; }
