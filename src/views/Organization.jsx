import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import * as api from '../utils/api';

const idOf = (o) => o?._id || o?.id;

export const Organization = () => {
  const { role, orgId } = useApp();
  const isSuperAdmin = role === 'super_admin';
  const isOrgAdmin = role === 'org_admin';
  const canCreateBranchOrUser = isSuperAdmin || isOrgAdmin;

  const [tab, setTab] = useState('orgs'); // 'orgs' | 'branches' | 'users'

  /* ── Organizations ── */
  const [orgs, setOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [orgsError, setOrgsError] = useState('');
  const [newOrgName, setNewOrgName] = useState('');

  const loadOrgs = useCallback(async () => {
    setOrgsLoading(true);
    setOrgsError('');
    try {
      const res = await api.fetchOrganizations();
      if (res.ok) setOrgs(res.data?.response_data || []);
      else setOrgsError(res.data?.response_message || 'Failed to load organizations.');
    } catch (e) {
      setOrgsError(`Network error: ${e.message}`);
    } finally {
      setOrgsLoading(false);
    }
  }, []);

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    const res = await api.createOrganization({ name: newOrgName.trim() });
    if (res.ok) { setNewOrgName(''); await loadOrgs(); }
    else alert(res.data?.response_message || 'Failed to create organization.');
  };

  const handleSuspendOrg = async (org) => {
    if (!window.confirm(`Suspend organization "${org.name}"?`)) return;
    const res = await api.suspendOrganization(idOf(org));
    if (res.ok) await loadOrgs();
    else alert(res.data?.response_message || 'Failed to suspend organization.');
  };

  /* ── Branches ── */
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchesError, setBranchesError] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchOrgId, setNewBranchOrgId] = useState('');
  // Which org's branches to view — GET /branches/read now requires org_id.
  // An Org Admin only has their own org; a Super Admin picks one to browse.
  const [viewOrgId, setViewOrgId] = useState('');

  useEffect(() => {
    if (orgId) setViewOrgId(orgId);
  }, [orgId]);

  const loadBranches = useCallback(async () => {
    if (!viewOrgId) { setBranches([]); return; }
    setBranchesLoading(true);
    setBranchesError('');
    try {
      const res = await api.fetchBranches(viewOrgId);
      if (res.ok) setBranches(res.data?.response_data || []);
      else setBranchesError(res.data?.response_message || 'Failed to load branches.');
    } catch (e) {
      setBranchesError(`Network error: ${e.message}`);
    } finally {
      setBranchesLoading(false);
    }
  }, [viewOrgId]);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim() || !newBranchOrgId) return;
    const res = await api.createBranch({ org_id: newBranchOrgId, name: newBranchName.trim() });
    if (res.ok) { setNewBranchName(''); await loadBranches(); }
    else alert(res.data?.response_message || 'Failed to create branch.');
  };

  const handleSuspendBranch = async (branch) => {
    if (!window.confirm(`Suspend branch "${branch.name}"?`)) return;
    const res = await api.suspendBranch(idOf(branch));
    if (res.ok) await loadBranches();
    else alert(res.data?.response_message || 'Failed to suspend branch.');
  };

  /* ── Users ── */
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('branch_user');
  const [newUserOrgId, setNewUserOrgId] = useState('');
  const [newUserBranchIds, setNewUserBranchIds] = useState([]);
  const [userOrgBranches, setUserOrgBranches] = useState([]);
  const [userOrgBranchesLoading, setUserOrgBranchesLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await api.fetchUsers();
      if (res.ok) setUsers(res.data?.response_data || []);
      else setUsersError(res.data?.response_message || 'Failed to load users.');
    } catch (e) {
      setUsersError(`Network error: ${e.message}`);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (newUserRole !== 'branch_user' || !newUserOrgId) { setUserOrgBranches([]); return; }
    setUserOrgBranchesLoading(true);
    api.fetchBranches(newUserOrgId).then(res => {
      setUserOrgBranches(res.ok ? (res.data?.response_data || []) : []);
    }).finally(() => setUserOrgBranchesLoading(false));
  }, [newUserRole, newUserOrgId]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newUserPassword) return;
    if (newUserRole === 'branch_user' && newUserBranchIds.length === 0) {
      alert('Select at least one branch for this branch user.');
      return;
    }
    const body = { username: newUsername.trim(), password: newUserPassword, role: newUserRole };
    if (newUserRole === 'branch_user') body.branch_ids = newUserBranchIds;
    else if (newUserOrgId) body.org_id = newUserOrgId;
    const res = await api.createUser(body);
    if (res.ok) {
      setNewUsername(''); setNewUserPassword(''); setNewUserBranchIds([]);
      await loadUsers();
    } else {
      alert(res.data?.response_message || 'Failed to create user.');
    }
  };

  const handleSuspendUser = async (user) => {
    if (!window.confirm(`Suspend user "${user.username}"?`)) return;
    const res = await api.suspendUser(idOf(user));
    if (res.ok) await loadUsers();
    else alert(res.data?.response_message || 'Failed to suspend user.');
  };

  useEffect(() => {
    if (tab === 'orgs') loadOrgs();
    else if (tab === 'branches') { if (orgs.length === 0) loadOrgs(); else loadBranches(); }
    else if (tab === 'users') { loadUsers(); if (orgs.length === 0) loadOrgs(); }
  }, [tab, loadOrgs, loadBranches, loadUsers]);

  // Super Admin: once orgs are loaded, default the Branches viewer to the first org.
  useEffect(() => {
    if (isSuperAdmin && !viewOrgId && orgs.length > 0) setViewOrgId(idOf(orgs[0]));
  }, [isSuperAdmin, orgs, viewOrgId]);

  useEffect(() => {
    if (tab === 'branches' && viewOrgId) loadBranches();
  }, [tab, viewOrgId, loadBranches]);

  // An Org Admin only manages their own org — default the create pickers to it.
  useEffect(() => {
    if (!orgId) return;
    setNewBranchOrgId(prev => prev || orgId);
    setNewUserOrgId(prev => prev || orgId);
  }, [orgId]);

  const orgName = (orgId) => orgs.find(o => idOf(o) === orgId)?.name || orgId || '—';

  const tabBtn = (id, label, icon) => (
    <button
      className={`filter-btn ${tab === id ? 'active' : ''}`}
      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
      onClick={() => setTab(id)}
    >
      <Icon name={icon} size={14} /> {label}
    </button>
  );

  return (
    <div>
      <PageHeader
        title="Organization"
        description="Manage organizations, branches, and admin/branch users across your deployment."
      />

      <div className="filter-bar" style={{ marginBottom: '20px' }}>
        {tabBtn('orgs', 'Organizations', 'shield')}
        {tabBtn('branches', 'Branches', 'grid')}
        {tabBtn('users', 'Users', 'users')}
      </div>

      {tab === 'orgs' && (
        <div className={isSuperAdmin ? 'grid-2-wide' : ''}>
          {isSuperAdmin && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title">Create Organization</div>
              <form onSubmit={handleCreateOrg}>
                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input className="form-input" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="Acme Corp" required />
                </div>
                <button type="submit" className="btn btn-primary">Create Organization</button>
              </form>
            </div>
          )}

          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-title">Organizations</div>
            {orgsError && <div className="banner-err">⚠️ {orgsError}</div>}
            {orgsLoading ? (
              <div className="text-muted">Loading…</div>
            ) : orgs.length > 0 ? (
              <div className="row-list">
                {orgs.map(o => (
                  <div className="row-item" key={idOf(o)}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{o.name}</div>
                      {o.org_code && <div className="text-muted" style={{ fontSize: '11px' }}>{o.org_code}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${o.status === 'active' ? 'badge-ok' : 'badge-err'}`}>{o.status || 'active'}</span>
                      {isSuperAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleSuspendOrg(o)}>Suspend</button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ border: 'none' }}>No organizations yet.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'branches' && (
        <div>
          {isSuperAdmin && (
            <div className="form-group" style={{ maxWidth: '320px' }}>
              <label className="form-label">Viewing Organization</label>
              <select className="form-select" value={viewOrgId} onChange={e => setViewOrgId(e.target.value)}>
                <option value="">Select organization…</option>
                {orgs.map(o => <option key={idOf(o)} value={idOf(o)}>{o.name}</option>)}
              </select>
            </div>
          )}
          <div className={canCreateBranchOrUser ? 'grid-2-wide' : ''}>
          {canCreateBranchOrUser && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title">Create Branch</div>
              <form onSubmit={handleCreateBranch}>
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select className="form-select" value={newBranchOrgId} onChange={e => setNewBranchOrgId(e.target.value)} disabled={isOrgAdmin} required>
                    <option value="">Select organization…</option>
                    {orgs.map(o => <option key={idOf(o)} value={idOf(o)}>{o.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input className="form-input" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} placeholder="Downtown Branch" required />
                </div>
                <button type="submit" className="btn btn-primary">Create Branch</button>
              </form>
            </div>
          )}

          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-title">Branches</div>
            {branchesError && <div className="banner-err">⚠️ {branchesError}</div>}
            {branchesLoading ? (
              <div className="text-muted">Loading…</div>
            ) : branches.length > 0 ? (
              <div className="row-list">
                {branches.map(b => (
                  <div className="row-item" key={idOf(b)}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{b.name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>{orgName(b.org_id)}{b.branch_code ? ` · ${b.branch_code}` : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${b.status === 'active' ? 'badge-ok' : 'badge-err'}`}>{b.status || 'active'}</span>
                      {canCreateBranchOrUser && <button className="btn btn-sm btn-danger" onClick={() => handleSuspendBranch(b)}>Suspend</button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ border: 'none' }}>No branches yet.</div>
            )}
          </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className={canCreateBranchOrUser ? 'grid-2-wide' : ''}>
          {canCreateBranchOrUser && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-title">Create User</div>
              <form onSubmit={handleCreateUser}>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input className="form-input" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input type="password" className="form-input" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={newUserRole} onChange={e => setNewUserRole(e.target.value)} disabled={isOrgAdmin}>
                    {isSuperAdmin && <option value="org_admin">Org Admin</option>}
                    <option value="branch_user">Branch User</option>
                  </select>
                  {isOrgAdmin && <div className="text-muted" style={{ fontSize: '10.5px', marginTop: '4px' }}>Org Admins can only create Branch Users in their own org.</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Organization</label>
                  <select className="form-select" value={newUserOrgId} onChange={e => { setNewUserOrgId(e.target.value); setNewUserBranchIds([]); }} disabled={isOrgAdmin}>
                    <option value="">Select organization…</option>
                    {orgs.map(o => <option key={idOf(o)} value={idOf(o)}>{o.name}</option>)}
                  </select>
                </div>
                {newUserRole === 'branch_user' && (
                  <div className="form-group">
                    <label className="form-label">Branches</label>
                    {userOrgBranchesLoading ? (
                      <div className="text-muted" style={{ fontSize: '12px' }}>Loading branches…</div>
                    ) : userOrgBranches.length > 0 ? (
                      <select
                        className="form-select"
                        multiple
                        value={newUserBranchIds}
                        onChange={e => setNewUserBranchIds(Array.from(e.target.selectedOptions, opt => opt.value))}
                        style={{ minHeight: '90px' }}
                      >
                        {userOrgBranches.map(b => <option key={idOf(b)} value={idOf(b)}>{b.name}</option>)}
                      </select>
                    ) : (
                      <div className="text-muted" style={{ fontSize: '12px' }}>{newUserOrgId ? 'No branches in this organization.' : 'Select an organization first.'}</div>
                    )}
                    <div className="text-muted" style={{ fontSize: '10.5px', marginTop: '4px' }}>Ctrl/Cmd-click to select multiple branches.</div>
                  </div>
                )}
                <button type="submit" className="btn btn-primary">Create User</button>
              </form>
            </div>
          )}

          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-title">Users</div>
            {usersError && <div className="banner-err">⚠️ {usersError}</div>}
            {usersLoading ? (
              <div className="text-muted">Loading…</div>
            ) : users.length > 0 ? (
              <div className="row-list">
                {users.map(u => (
                  <div className="row-item" key={idOf(u)}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {u.username}
                        {u.user_code && <span className="badge badge-muted" style={{ fontSize: '9px' }}>{u.user_code}</span>}
                      </div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {u.role}{u.org_id ? ` · ${orgName(u.org_id)}` : ''}{Array.isArray(u.branch_ids) && u.branch_ids.length > 0 ? ` · ${u.branch_ids.length} branch${u.branch_ids.length > 1 ? 'es' : ''}` : ''}
                      </div>
                    </div>
                    {canCreateBranchOrUser && <button className="btn btn-sm btn-danger" onClick={() => handleSuspendUser(u)}>Suspend</button>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ border: 'none' }}>No users yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Organization;
