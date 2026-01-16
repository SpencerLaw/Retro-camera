// ... (imports remain same)

interface Message {
    id: string;
    text: string;
    isEmergency: boolean;
    timestamp: string;
    channelName?: string; // Add channelName to Message interface
}

// ... (other interfaces and components remain same)

const Sender: React.FC<{ license: string, isDark: boolean }> = ({ license, isDark }) => {
    // ... (state initialization remains same)

    const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
    const channelCode = activeChannel?.code || '';

    // ... (effects remain same)

    const handleSend = async () => {
        if (!channelCode.trim() || !inputText.trim()) {
            setStatus({ type: 'error', msg: t('broadcast.sender.missingField') });
            return;
        }

        setStatus({ type: 'loading', msg: t('broadcast.sender.broadcasting') });

        try {
            const resp = await fetch('/api/broadcast/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    license,
                    code: channelCode.trim(),
                    text: inputText.trim(),
                    isEmergency,
                }),
            });

            const data = await resp.json();

            if (data.success) {
                const newMessage: Message = {
                    id: data.messageId,
                    text: inputText.trim(),
                    isEmergency,
                    timestamp: new Date().toLocaleTimeString(window.navigator.language, { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    channelName: activeChannel.name // Capture current channel name
                };

                const newHistory = [newMessage, ...history].slice(0, 30);
                setHistory(newHistory);
                localStorage.setItem('br_sender_history', JSON.stringify(newHistory));

                setInputText('');
                setIsEmergency(false);
                setStatus({ type: 'success', msg: t('broadcast.sender.broadcastDelivered') });

                setTimeout(() => setStatus({ type: null, msg: '' }), 3000);
            } else {
                throw new Error(data.error || 'Server Error');
            }
        } catch (err: any) {
            setStatus({ type: 'error', msg: t('broadcast.sender.failedToSend') });
        }
    };

    // ... (other functions remain same)

    return (
        <div className="space-y-8 max-w-2xl mx-auto px-4 pb-20">
            {/* Channel Management Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-30">{t('broadcast.sender.manageClasses')}</h3>
                    <button
                        onClick={addChannel}
                        className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-90"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex flex-nowrap overflow-x-auto gap-4 py-2 px-1 no-scrollbar scroll-smooth">
                    {channels.map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setActiveChannelId(channel.id)}
                            className={`flex-none px-6 py-4 rounded-3xl border transition-all duration-300 flex items-center gap-3 relative group ${activeChannelId === channel.id
                                ? 'bg-gradient-to-r from-pink-500/90 to-rose-500/90 backdrop-blur-md border-pink-500/30 text-white shadow-xl scale-105 shadow-pink-500/20'
                                : 'bg-white/50 dark:bg-white/5 border-black/5 dark:border-white/5 text-gray-400 hover:bg-white/80 dark:hover:bg-white/10'
                                }`}
                        >
                            <div className="text-left">
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeChannelId === channel.id ? 'opacity-80 text-white' : 'opacity-40'}`}>ROOM {channel.code}</p>
                                <p className="text-sm font-bold truncate max-w-[120px]">{channel.name}</p>
                            </div>
                            <div className={`flex items-center gap-1 ${activeChannelId === channel.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                <div
                                    onClick={(e) => startEditing(channel, e)}
                                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <Edit2 size={14} />
                                </div>
                                {channels.length > 1 && (
                                    <div
                                        onClick={(e) => deleteChannel(channel.id, e)}
                                        className={`p-1.5 rounded-lg transition-colors ${activeChannelId === channel.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-500/20 text-red-500/60 hover:text-red-500'}`}
                                    >
                                        <Trash2 size={14} />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Channel Details / Editor */}
            {editingChannel ? (
                <GlassCard className="p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-2 border-blue-500/30">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('broadcast.sender.className')}</label>
                            <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all dark:text-white"
                                placeholder="输入班级名称"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-30">{t('broadcast.sender.roomCode')}</label>
                            <div className="relative">
                                <input
                                    value={editCode}
                                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                                    className="w-full bg-gray-100 dark:bg-white/5 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all dark:text-white uppercase tracking-widest"
                                    placeholder="4位数字"
                                    maxLength={8}
                                />
                                <button
                                    onClick={generateRandomChannel}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                >
                                    <RefreshCw size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setEditingChannel(null)}
                            className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-white/5 font-bold hover:bg-gray-200 transition-all"
                        >
                            取消
                        </button>
                        <button
                            onClick={saveEdit}
                            className="flex-1 py-4 rounded-2xl bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            保存
                        </button>
                    </div>
                </GlassCard>
            ) : (
                <GlassCard className="p-8 flex items-center justify-between group relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600"></div>
                    <div className="space-y-1 min-w-0 flex-1 mr-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
                            <Radio size={12} className="text-blue-500" /> {activeChannel?.name}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-6xl font-black tracking-tighter italic bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent px-1 min-w-[200px]">
                                {channelCode}
                            </div>
                            <button onClick={copyRoomId} className="p-2 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                                <Copy size={20} />
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-[10px] font-black tracking-widest uppercase truncate max-w-[100px]">
                            {t('broadcast.sender.active')}
                        </div>
                    </div>
                </GlassCard>
            )}

            {/* Input Section */}
            <GlassCard className="p-10 space-y-8">
                <div className="relative group">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t('broadcast.sender.broadcastPlaceholder')}
                        rows={4}
                        autoFocus
                        className="w-full bg-transparent border-none text-2xl font-bold tracking-tight outline-none resize-none placeholder:opacity-20 transition-all min-h-[140px] dark:text-white"
                    />
                    <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                </div>

                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsEmergency(!isEmergency)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEmergency
                            ? 'bg-red-500 text-white shadow-[0_10px_20px_-5px_rgba(239,68,68,0.5)] scale-105'
                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                    >
                        <AlertTriangle size={18} /> {t('broadcast.sender.emergencyMode')}
                    </button>

                    <button
                        onClick={handleSend}
                        disabled={status.type === 'loading'}
                        className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-[1.5rem] font-bold text-lg hover:opacity-90 shadow-xl active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-3"
                    >
                        {status.type === 'loading' ? <Loader2 size={24} className="animate-spin" /> : <Send size={20} />}
                        {t('broadcast.sender.launch')}
                    </button>
                </div>

                {status.type && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 text-sm font-bold border ${status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        status.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}>
                        {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        {status.msg}
                    </div>
                )}
            </GlassCard>

            {/* History Section */}
            <GlassCard className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            <History size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold tracking-tight">{t('broadcast.sender.timeline')}</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 italic">{t('broadcast.sender.last30Sessions')}</p>
                        </div>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                        title={t('broadcast.sender.wipeLogs')}
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto px-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-12 opacity-20">
                            <Send size={48} className="mx-auto mb-4" />
                            <p className="text-sm font-bold tracking-tighter">{t('broadcast.sender.silentAirwaves')}</p>
                        </div>
                    ) : (
                        history.map((msg) => (
                            <div key={msg.id} className="group p-5 rounded-3xl bg-gray-50 dark:bg-white/[0.03] border border-transparent hover:border-white/10 transition-all flex items-start gap-4">
                                <div className="pt-1">
                                    {msg.isEmergency ? (
                                        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                            <AlertTriangle size={14} />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Clock size={14} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black opacity-30 uppercase">{msg.timestamp}</span>
                                            {msg.channelName && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 opacity-60">
                                                    {msg.channelName}
                                                </span>
                                            )}
                                        </div>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-20 transition-opacity" />
                                    </div>
                                    <p className={`text-base font-semibold leading-relaxed ${msg.isEmergency ? 'text-red-500' : 'opacity-80'}`}>{msg.text}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

export default Sender;
