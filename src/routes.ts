import { lazy } from 'solid-js';
import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/home';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Home,
  },
  {
    path: '/settings',
    component: lazy(() => import('./pages/settings')),
  },
  {
    path: '/share-target',
    component: lazy(() => import('./pages/share-target')),
  },
  {
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
];
