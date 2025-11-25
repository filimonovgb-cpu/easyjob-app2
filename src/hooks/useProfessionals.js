import { useState, useEffect, useCallback } from 'react';
import { professionalsAPI } from '../services/api';
import { useLocation } from './useLocation';

export const useProfessionals = (categoryId = null) => {
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { location, getCurrentLocation } = useLocation();

  const fetchProfessionals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data;
      
      if (location) {
        data = await professionalsAPI.getNearby(
          location.latitude,
          location.longitude,
          10,
          categoryId
        );
      } else {
        data = await professionalsAPI.getAll();
        
        if (categoryId) {
          data = data.filter(p => p.categoryId === categoryId);
        }
      }

      setProfessionals(data);
    } catch (err) {
      console.error('Error fetching professionals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [location, categoryId]);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const refresh = async () => {
    await getCurrentLocation();
    await fetchProfessionals();
  };

  const filterByCategory = (newCategoryId) => {
    if (newCategoryId) {
      return professionals.filter(p => p.categoryId === newCategoryId);
    }
    return professionals;
  };

  const sortByDistance = () => {
    return [...professionals].sort((a, b) => 
      (a.distance || 999) - (b.distance || 999)
    );
  };

  const sortByRating = () => {
    return [...professionals].sort((a, b) => 
      (b.rating || 0) - (a.rating || 0)
    );
  };

  const sortByPrice = (ascending = true) => {
    return [...professionals].sort((a, b) => 
      ascending 
        ? (a.pricePerHour || 0) - (b.pricePerHour || 0)
        : (b.pricePerHour || 0) - (a.pricePerHour || 0)
    );
  };

  return {
    professionals,
    isLoading,
    error,
    refresh,
    filterByCategory,
    sortByDistance,
    sortByRating,
    sortByPrice
  };
};
