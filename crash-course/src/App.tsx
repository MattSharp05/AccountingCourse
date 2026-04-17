import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ui';
import { Landing } from './pages/Landing';
import { Home } from './pages/Home';
import { GameMap } from './pages/GameMap';
import { StudentLogin } from './pages/StudentLogin';
import { StudentCourseDetail } from './pages/StudentCourseDetail';
import { StudentAuthGuard } from './components/StudentAuthGuard';
import { AdminDashboard, CourseDetail, ModuleDetail, MapEditor, LoginPage } from './pages/admin';
import { AuthGuard } from './components/admin/AuthGuard';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  // Public marketing landing
  { path: '/', element: <Landing /> },

  // Student auth
  { path: '/login', element: <StudentLogin /> },

  // Student routes (protected)
  { path: '/home', element: <StudentAuthGuard><Home /></StudentAuthGuard> },
  { path: '/course/:courseId', element: <StudentAuthGuard><StudentCourseDetail /></StudentAuthGuard> },
  { path: '/game/map/:mapId', element: <StudentAuthGuard><GameMap /></StudentAuthGuard> },

  // Admin routes
  { path: '/admin/login', element: <LoginPage /> },
  { path: '/admin', element: <AuthGuard><AdminDashboard /></AuthGuard> },
  { path: '/admin/course/:courseId', element: <AuthGuard><CourseDetail /></AuthGuard> },
  { path: '/admin/course/:courseId/module/:moduleId', element: <AuthGuard><ModuleDetail /></AuthGuard> },
  { path: '/admin/map/:mapId', element: <AuthGuard><MapEditor /></AuthGuard> },
]);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
