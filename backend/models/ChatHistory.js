const mongoose = require('mongoose');

const chatHistorySchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        sessionId: {
            type: String,
            required: true
        },
        title: {
            type: String,
            default: ""
        },
        message: {
            type: String,
            required: [true, 'Message text is required']
        },
        response: {
            type: String,
            required: [true, 'Response text is required']
        }
    },
    {
        timestamps: true
    }
);

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
module.exports = ChatHistory;
