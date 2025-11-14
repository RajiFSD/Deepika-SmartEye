import { useState, useEffect } from "react";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Sliders,
  CheckCircle,
  XCircle,
  Search,
  ToggleRight,
  ToggleLeft,
  Download,
} from "lucide-react";
import productConfigService from "../services/productConfigService";
import productService from "../services/productService";
import authService from "../services/authService";

function ProductConfigPage() {
  const [configs, setConfigs] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 8;

  const [formData, setFormData] = useState({
    product_id: "",
    layers_count: 1,
    racks_per_layer: 1,
    items_per_rack: 1,
    box_capacity: "",
    bottle_ml: "",
    arrangement_type: "",
    tolerance_limit: 0,
    //is_active: true,
  });

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadConfigs();
    loadProducts();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await productConfigService.getConfigs();
      const data = response.data || {};
      const list = data.configs || data.rows || [];
      setConfigs(list);
    } catch (err) {
      console.error("❌ Error loading configs:", err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productService.getProducts();
      setProducts(response.data?.products || response.data || []);
    } catch (err) {
      console.error("Error loading products:", err);
    }
  };

  const totalCount = configs.length;
  const activeCount = 2 ; //configs.filter((c) => c.is_active).length;
  const inactiveCount = totalCount - activeCount;

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const filtered = configs.filter((c) => {
    const searchTerm = search.toLowerCase();
    return (
      c.arrangement_type?.toLowerCase().includes(searchTerm) ||
      c.product_name?.toLowerCase().includes(searchTerm)
    );
  });

  const totalPages = Math.ceil(filtered.length / limit);
  const currentData = filtered.slice((page - 1) * limit, page * limit);

  const handleOpenModal = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        product_id: config.product_id,
        layers_count: config.layers_count,
        racks_per_layer: config.racks_per_layer,
        items_per_rack: config.items_per_rack,
        box_capacity: config.box_capacity,
        bottle_ml: config.bottle_ml,
        arrangement_type: config.arrangement_type,
        tolerance_limit: config.tolerance_limit,
       // is_active: config.is_active ?? true,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        product_id: "",
        layers_count: 1,
        racks_per_layer: 1,
        items_per_rack: 1,
        box_capacity: "",
        bottle_ml: "",
        arrangement_type: "",
        tolerance_limit: 0,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingConfig) {
        await productConfigService.updateConfig(editingConfig.id, formData);
        alert("Configuration updated successfully!");
      } else {
        await productConfigService.createConfig(formData);
        alert("Configuration added successfully!");
      }
      setShowModal(false);
      loadConfigs();
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this configuration?")) return;
    try {
      setLoading(true);
      await productConfigService.deleteConfig(id);
      alert("Configuration deleted!");
      loadConfigs();
    } catch (err) {
      alert(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (config) => {
    try {
      await productConfigService.updateConfig(config.id, {
        is_active: !config.is_active,
      });
      loadConfigs();
    } catch (err) {
      alert("Error updating status");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Product",
      "Layers",
      "Racks/Layer",
      "Items/Rack",
      "Box Capacity",
      "Bottle (ml)",
      "Arrangement",
      "Tolerance",
      "Status",
    ];
    const rows = configs.map((c) => [
      c.product_name || c.product_id,
      c.layers_count,
      c.racks_per_layer,
      c.items_per_rack,
      c.box_capacity || "",
      c.bottle_ml || "",
      c.arrangement_type || "",
      c.tolerance_limit,
      c.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "product_configurations.csv";
    link.click();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Configuration</h1>
          <p className="text-gray-600">
            Manage configuration for product stacking and tolerance limits
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
          >
            <Download className="w-5 h-5" /> Export CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" /> Add Config
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Configs</p>
            <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
          </div>
          <Sliders className="w-10 h-10 text-blue-600" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </div>
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Inactive</p>
            <p className="text-3xl font-bold text-red-600">{inactiveCount}</p>
          </div>
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search configuration..."
            className="border-0 focus:ring-0 focus:outline-none text-gray-700 w-64"
          />
        </div>
        <p className="text-sm text-gray-500">
          Showing {currentData.length} of {filtered.length} configurations
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Product",
                "Layers",
                "Racks/Layer",
                "Items/Rack",
                "Box Cap.",
                "Bottle (ml)",
                "Arrangement",
                "Tolerance",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((cfg) => (
              <tr key={cfg.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                  {cfg.product_name || `#${cfg.product_id}`}
                </td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.layers_count}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.racks_per_layer}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.items_per_rack}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.box_capacity || "—"}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.bottle_ml || "—"}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.arrangement_type || "—"}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{cfg.tolerance_limit}</td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleToggleActive(cfg)}
                    className="flex items-center justify-center mx-auto"
                  >
                    {cfg.is_active ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleOpenModal(cfg)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cfg.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > limit && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">
                {editingConfig ? "Edit Config" : "Add Config"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Product *
                </label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              {[
                "layers_count",
                "racks_per_layer",
                "items_per_rack",
                "box_capacity",
                "bottle_ml",
                "tolerance_limit",
              ].map((f) => (
                <div key={f}>
                  <label className="block mb-1 text-sm font-medium text-gray-700 capitalize">
                    {f.replace(/_/g, " ")}
                  </label>
                  <input
                    type="number"
                    name={f}
                    value={formData[f]}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              ))}

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Arrangement Type
                </label>
                <input
                  type="text"
                  name="arrangement_type"
                  value={formData.arrangement_type}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4"
                  id="is_active"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="col-span-2 flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />{" "}
                  {editingConfig ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductConfigPage;
