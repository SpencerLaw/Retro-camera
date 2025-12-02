import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, XCircle, Loader, Trash2 } from 'lucide-react';
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
  const [licenseCode, setLicenseCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
      setError('授权码格式不正确，应为16位字符');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    const result = await verifyLicenseCode(licenseCode);

    setIsLoading(false);

    if (result.success) {
      setSuccess('✅ 授权成功！正在启动...');
      setTimeout(() => {
        onVerified();
      }, 1000);
    } else {
      setError(result.message || '授权码无效，请检查后重试');
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
    if (window.confirm('确定要清除本地授权缓存吗？')) {
      localStorage.removeItem('doraemon_license_code');
      localStorage.removeItem('doraemon_verified');
      localStorage.removeItem('doraemon_device_id');
      setSuccess('✅ 缓存已清除！刷新页面生效');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="license-container">
      <div className="license-card">
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
          🤫 分贝检测仪
        </h1>
        <p className="license-subtitle">请输入您购买的授权码</p>

        {/* 开发者工具 */}
        {showDevTools && (
          <div className="dev-tools">
            <button className="dev-clear-btn" onClick={handleClearCache}>
              <Trash2 size={16} />
              <span>清除授权缓存</span>
            </button>
            <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              开发者模式已启用
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
              <span>验证中...</span>
            </>
          ) : (
            <>
              <CheckCircle size={20} />
              <span>验证授权码</span>
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

        {/* 说明 */}
        <div className="license-info">
          <p>💡 授权码为16位字符</p>
          <p>💡 有效期1年，不限设备数量</p>
        </div>
      </div>
    </div>
  );
};

export default LicenseInput;

