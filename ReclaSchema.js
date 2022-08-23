
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        default: ""
    },
    author: {
        type: String,
        required: true,
        default: ""
    },
    league: {
        type: String,
        required: true,
        default: ""
    },
    instant: {
        type: String,
        required: true,
        default: ""
    },
    drivers: {
        type: Array,
        required: true,
        default: []
    }
})

module.exports = mongoose.model('reclas', schema)