import { useState } from "react";
import { Sun, Leaf, Waves, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const [theme, setTheme] = useState("earth");
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("DD MMM YYYY");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [notifications, setNotifications] = useState({
    email: true,
    highPollution: true,
    weekly: false,
  });

  return (
    <div className="page-container">
      <div className="page-heading">
        <h1>Settings</h1>
        <p>Manage your preferences and account settings.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Left column */}
        <div>
          {/* General Settings */}
          <div className="settings-section">
            <div className="settings-section-title">General Settings</div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">Theme</div>
                <div className="settings-row-desc">Choose your preferred interface theme</div>
              </div>
              <div className="theme-options">
                <button className={`theme-option${theme === 'light' ? ' active' : ''}`} onClick={() => setTheme('light')}>
                  <Sun size={14} /> Light
                </button>
                <button className={`theme-option${theme === 'earth' ? ' active' : ''}`} onClick={() => setTheme('earth')}>
                  <Leaf size={14} /> Earth
                </button>
                <button className={`theme-option${theme === 'ocean' ? ' active' : ''}`} onClick={() => setTheme('ocean')}>
                  <Waves size={14} /> Ocean
                </button>
              </div>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">Language</div>
                <div className="settings-row-desc">Interface language</div>
              </div>
              <select
                className="filter-select"
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
              </select>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">Date Format</div>
              </div>
              <select
                className="filter-select"
                value={dateFormat}
                onChange={e => setDateFormat(e.target.value)}
              >
                <option value="DD MMM YYYY">DD MMM YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">Items per page</div>
              </div>
              <select
                className="filter-select"
                value={itemsPerPage}
                onChange={e => setItemsPerPage(e.target.value)}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>

          {/* Save button */}
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
            Save Changes
          </button>
        </div>

        {/* Right column */}
        <div>
          {/* Notification Preferences */}
          <div className="settings-section">
            <div className="settings-section-title">Notification Preferences</div>

            {[
              { key: 'email',        label: 'Email Notifications',   desc: 'Receive email updates' },
              { key: 'highPollution',label: 'High-Pollution Alerts',  desc: 'Get alerted for high pollution beaches' },
              { key: 'weekly',       label: 'Weekly Reports',         desc: 'Receive weekly summary reports' },
            ].map(n => (
              <div key={n.key} className="settings-row">
                <div>
                  <div className="settings-row-label">{n.label}</div>
                  <div className="settings-row-desc">{n.desc}</div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications[n.key]}
                    onChange={e => setNotifications(prev => ({ ...prev, [n.key]: e.target.checked }))}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>

          {/* Data & Privacy */}
          <div className="settings-section">
            <div className="settings-section-title">Data & Privacy</div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label">Export My Data</div>
                <div className="settings-row-desc">Download all your data</div>
              </div>
              <button className="export-btn">Export</button>
            </div>

            <div className="settings-row">
              <div>
                <div className="settings-row-label" style={{ color: 'var(--rose)' }}>Delete Account</div>
                <div className="settings-row-desc">Permanently deletes your account</div>
              </div>
              <button style={{ background: 'transparent', border: '1.5px solid var(--rose)', color: 'var(--rose)', borderRadius: '8px', padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
