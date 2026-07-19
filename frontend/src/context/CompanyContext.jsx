import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import api from '../api/client';
import { applyThemeToDocument } from '../constants/themes';
import { useAuth } from './AuthContext';

export const ALL_COMPANIES = {
  _id: 'all',
  slug: 'all',
  name: 'All companies',
  type: 'platform',
  description: 'Combined view across every company',
};

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const isAllCompanies = activeCompany?.slug === 'all';

  const switchCompany = useCallback(
    (company) => {
      setActiveCompany(company);
      if (user?.role === 'admin' && company?.slug) {
        localStorage.setItem('gat_active_company', company.slug);
        applyThemeToDocument(company.slug);
      }
    },
    [user?.role]
  );

  const refreshCompanies = useCallback(async () => {
    if (!user) {
      setCompanies([]);
      setActiveCompany(null);
      applyThemeToDocument('all');
      return [];
    }

    setLoadingCompanies(true);
    try {
      const { data } = await api.get('/companies');
      setCompanies(data);

      setActiveCompany((current) => {
        if (user.role === 'admin') {
          // URL sync owns selection for admin; keep current if already set
          if (current) return current;

          const saved = localStorage.getItem('gat_active_company') || 'all';
          if (saved === 'all') return ALL_COMPANIES;

          const found = data.find((c) => c.slug === saved);
          return found || ALL_COMPANIES;
        }

        if (user.company) {
          const own =
            data.find(
              (c) =>
                c._id === user.company._id ||
                c._id === user.company ||
                c.slug === user.company.slug
            ) || user.company;

          if (current?._id === own._id || current?.slug === own.slug) {
            return current;
          }
          return own;
        }

        return null;
      });

      return data;
    } catch {
      setCompanies([]);
      return [];
    } finally {
      setLoadingCompanies(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCompanies();
  }, [refreshCompanies]);

  useEffect(() => {
    if (user?.role === 'user' && activeCompany?.slug) {
      applyThemeToDocument(activeCompany.slug);
    }
  }, [user?.role, activeCompany?.slug]);

  return (
    <CompanyContext.Provider
      value={{
        companies,
        activeCompany,
        isAllCompanies,
        switchCompany,
        refreshCompanies,
        loadingCompanies,
        ALL_COMPANIES,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
