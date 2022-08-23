
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    leagues: {
        type: Array,
        required: false,
        default: []
    },
    teams: {
        type: Array,
        required: false,
        default: []
    },
    recla_channel: {
        type: String,
        required: false,
        default: ''
    },
    recla_category: {
        type: String,
        required: false,
        default: ''
    },
    driver_role: {
        type: String,
        required: false,
        default: ''
    },
    admin_role: {
        type: String,
        required: false,
        default: ''
    }
})

// export default mongoose.model('vlf1-recla', schema)
module.exports = mongoose.model('configs', schema)