import React, { useState } from 'react';
import { Key, CheckCircle, XCircle, Loader } from 'lucide-react';
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

  return (
    <div className="license-container">
      <div className="license-card">
        {/* 图标 */}
        <div className="license-icon">
          <Key size={48} />
        </div>

        {/* 标题 */}
        <h1 className="license-title">🤫 分贝检测仪</h1>
        <p className="license-subtitle">请输入您购买的授权码</p>

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

        {/* 购买提示 */}
        <div className="license-footer">
          <p>💡 请从正规渠道购买授权码</p>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '5px' }}>
            购买后即可获得授权码，永久有效
          </p>
        </div>

        {/* 说明 */}
        <div className="license-info">
          <p>💡 授权码为16位字符</p>
          <p>💡 一个授权码最多可在3台设备上使用</p>
          <p>💡 购买后即时发货，永久有效</p>
        </div>
      </div>
    </div>
  );
};

export default LicenseInput;

