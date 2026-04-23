import db from "../db.js";

export async function updateData(req, res) {
  try {
    const { id, nama, geom } = req.body;

    await db.query(
      `
      UPDATE aset_holding
      SET nama = $1,
          geom = ST_GeomFromText($2, 4326)
      WHERE id = $3
      `,
      [nama, geom, id],
    );

    res.json({ message: "Data berhasil diupdate" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error update data" });
  }
}
