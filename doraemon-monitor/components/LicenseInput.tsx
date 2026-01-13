import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslations } from '../../hooks/useTranslations';
import { Key, CheckCircle, XCircle, Loader, Trash2, ArrowLeft } from 'lucide-react';
import { 
  verifyLicenseCode, 
  formatLicenseCode, 
  isValidFormat 
} from '../utils/licenseManager';
import '../styles/license-input.css';

interface LicenseInputProps {
  onVerified: () => void;
}

const LicenseInput: React.FC<LicenseInputProps> = ({ onVerified }) => {
  const navigate = useNavigate();
  const t = useTranslations();
  const [licenseCode, setLicenseCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // ... (rest of states)
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDevTools, setShowDevTools] = useState(false);

  // 检测开发者模式（连续点击标题5次）
  const [clickCount, setClickCount] = useState(0);
  
  useEffect(() => {
    if (clickCount >= 5) {
      setShowDevTools(true);
      setClickCount(0);
    }
    const timer = setTimeout(() => setClickCount(0), 2000);
    return () => clearTimeout(timer);
  }, [clickCount]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatLicenseCode(value);
    
    if (formatted.length <= 19) { // XXXX-XXXX-XXXX-XXXX = 19字符
      setLicenseCode(formatted);
      setError('');
      setSuccess('');
    }
  };

  const handleVerify = async () => {
    if (!isValidFormat(licenseCode)) {
      setError(t('doraemon.license.invalidFormat'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const result = await verifyLicenseCode(licenseCode);

    setIsLoading(false);

    if (result.success) {
      setSuccess(t('doraemon.license.success'));
      setTimeout(() => {
        onVerified();
      }, 1000);
    } else {
      setError(result.message || t('doraemon.license.invalidCode'));
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const formatted = formatLicenseCode(pastedText);
    setLicenseCode(formatted);
  };

  // 清除本地授权数据
  const handleClearCache = () => {
    if (window.confirm(t('doraemon.license.confirmClear'))) {
      localStorage.removeItem('doraemon_license_code');
      localStorage.removeItem('doraemon_verified');
      localStorage.removeItem('doraemon_device_id');
      setSuccess(t('doraemon.license.cleared'));
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="license-container">
      <div className="license-card">
        {/* 返回按钮 */}
        <button 
          onClick={() => navigate('/')} 
          className="license-back-btn"
          title={t('doraemon.license.backHome')}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '5px'
          }}
        >
          <ArrowLeft size={24} />
        </button>

        {/* 图标 */}
        <div className="license-icon">
          <Key size={48} />
        </div>

        {/* 标题（点击5次开启开发者模式） */}
        <h1 
          className="license-title" 
          onClick={() => setClickCount(c => c + 1)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {t('doraemon.license.title')}
        </h1>
        <p className="license-subtitle">{t('doraemon.license.subtitle')}</p>

        {/* 开发者工具 */}
        {showDevTools && (
          <div className="dev-tools">
            <button className="dev-clear-btn" onClick={handleClearCache}>
              <Trash2 size={16} />
              <span>{t('doraemon.license.clearCache')}</span>
            </button>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              {t('doraemon.license.devMode')}
            </p>
          </div>
        )}

        {/* 输入框 */}
        <div className="license-input-group">
          <input
            type="text"
            className="license-input"
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={licenseCode}
            onChange={handleInputChange}
            onPaste={handlePaste}
            disabled={isLoading}
            maxLength={19}
          />
        </div>

        {/* 验证按钮 */}
        <button
          className="license-button"
          onClick={handleVerify}
          disabled={isLoading || !isValidFormat(licenseCode)}
        >
          {isLoading ? (
            <>
              <Loader className="spinning" size={20} />
              <span>{t('doraemon.license.verifying')}</span>
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              <span>{t('doraemon.license.verify')}</span>
            </>
          )}
        </button>

        {/* 错误消息 */}
        {error && (
          <div className="license-message error">
            <XCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 成功消息 */}
        {success && (
          <div className="license-message success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LicenseInput;

