import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../store';
import { getCurrentUser } from '../store/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { isAuthenticated, status } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // If we have a token but no user data, try to fetch the current user
    if (isAuthenticated && status === 'idle') {
      dispatch(getCurrentUser());
    }
  }, [dispatch, isAuthenticated, status]);

  // If not authenticated, redirect to login page with the return url
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the children
  return <>{children}</>;
};

export default ProtectedRoute;
