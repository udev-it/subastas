const supabase = require("../config/supabaseClient");

const getTablaValidaciones = async (req, res) => {
    const { id_postor } = req.params;

    try {
        const { data, error } = await supabase
            .from("criterios_postor")
            .select("*")
            .eq("id_postor", id_postor)
            .single();

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { getTablaValidaciones };
