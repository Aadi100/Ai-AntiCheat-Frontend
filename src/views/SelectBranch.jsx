import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import * as api from '../utils/api';

const idOf = (o) => o?._id || o?.id;

export const SelectBranch = () => {
  const { role, selectedOrgId, setSelectedBranchId } = useApp();
  const navigate = useNavigate();

  const [branches, setBranches] = useState([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Super Admin must pick an org first; Org Admin's own org is implied.
    if (role === 'super_admin' && !selectedOrgId) {
      navigate('/select-organization', { replace: true });
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [branchRes, orgRes] = await Promise.all([
          api.fetchBranches(selectedOrgId),
          selectedOrgId ? api.fetchOrganizations() : Promise.resolve(null)
        ]);
        if (branchRes.ok) setBranches((branchRes.data?.response_data || []).filter(b => b.status !== 'suspended'));
        else setError(branchRes.data?.response_message || 'Failed to load branches.');

        if (orgRes?.ok) {
          const org = (orgRes.data?.response_data || []).find(o => idOf(o) === selectedOrgId);
          if (org) setOrgName(org.name);
        }
      } catch (e) {
        setError(`Network error: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, selectedOrgId]);

  const openBranch = (branch) => {
    setSelectedBranchId(idOf(branch));
    navigate('/dashboard');
  };

  return (
    <div>
      {role === 'super_admin' && (
        <div style={{ marginBottom: '14px' }}>
          <Link to="/select-organization" className="link-accent">← Back to Organizations</Link>
        </div>
      )}

      <PageHeader
        title="Select Branch"
        description={orgName ? `Choose a branch within ${orgName} to view its dashboard and data.` : 'Choose a branch to view its dashboard and data.'}
      />

      {error && <div className="banner-err">⚠️ {error}</div>}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '240px' }}>
          <div className="spinner" style={{ width: '28px', height: '28px' }}></div>
        </div>
      ) : branches.length > 0 ? (
        <div className="person-grid">
          {branches.map(b => (
            <div key={idOf(b)} className="person-card" style={{ cursor: 'pointer', padding: '18px' }} onClick={() => openBranch(b)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="grid" size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="person-card-name">{b.name}</div>
                  {b.branch_code && <div className="person-card-meta">{b.branch_code}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="grid" size={30} /></div>
          No branches found for this organization. Create one from the Organization admin page.
        </div>
      )}
    </div>
  );
};

export default SelectBranch;
