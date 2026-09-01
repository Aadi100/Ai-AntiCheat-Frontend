import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import * as api from '../utils/api';

const idOf = (o) => o?._id || o?.id;

export const SelectOrganization = () => {
  const { setSelectedOrgId } = useApp();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.fetchOrganizations();
        if (res.ok) setOrgs((res.data?.response_data || []).filter(o => o.status !== 'suspended'));
        else setError(res.data?.response_message || 'Failed to load organizations.');
      } catch (e) {
        setError(`Network error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openOrg = (org) => {
    setSelectedOrgId(idOf(org));
    navigate('/select-branch');
  };

  return (
    <div>
      <PageHeader
        title="Select Organization"
        description="Choose an organization to manage its branches and view branch-scoped data."
      />

      {error && <div className="banner-err">⚠️ {error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
          <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
        </div>
      ) : orgs.length > 0 ? (
        <div className="person-grid">
          {orgs.map(o => (
            <div key={idOf(o)} className="person-card" style={{ cursor: 'pointer', padding: '18px' }} onClick={() => openOrg(o)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="shield" size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="person-card-name">{o.name}</div>
                  {o.org_code && <div className="person-card-meta">{o.org_code}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="shield" size={30} /></div>
          No organizations found. Create one from the Organization admin page.
        </div>
      )}
    </div>
  );
};

export default SelectOrganization;
