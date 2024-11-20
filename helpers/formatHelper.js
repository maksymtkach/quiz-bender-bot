function formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours} год ${minutes} хв ${seconds} сек`;
};

function escapeMarkdownV2(text) {
    return text.replace(/([\*\_\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!])/g, '\\$1');
};

module.exports = { 
    formatTime,
    escapeMarkdownV2 
}