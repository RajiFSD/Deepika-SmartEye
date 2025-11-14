import { useState, useEffect } from "react";
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ToggleRight,
  ToggleLeft,
  CheckCircle,
  XCircle,
  Search,
  Download,
} from "lucide-react";
import productService from "../services/productService";
import authService from "../services/authService";

function ProductMasterPage() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 8;

  const [formData, setFormData] = useState({
    product_name: "",
    product_type: "",
    size: "",
    description: "",
    uom: "",
    is_active: true,
  });

  const user = authService.getCurrentUser();

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await productService.getProducts();
      const data = response.data || {};
      const list = data.products || data.rows || [];
      setProducts(list);
      setFiltered(list);
    } catch (err) {
      console.error("❌ Error loading products:", err);
      setError(err?.toString?.() || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    setSearch(value);
    if (!value) {
      setFiltered(products);
    } else {
      const lower = value.toLowerCase();
      const result = products.filter(
        (p) =>
          p.product_name?.toLowerCase().includes(lower) ||
          p.product_type?.toLowerCase().includes(lower) ||
          p.size?.toLowerCase().includes(lower) ||
          p.uom?.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower)
      );
      setFiltered(result);
      setPage(1);
    }
  };

  const totalCount = filtered.length;
  const activeCount = filtered.filter((p) => p.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const totalPages = Math.ceil(totalCount / limit);
  const currentData = filtered.slice((page - 1) * limit, page * limit);

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        product_name: product.product_name || "",
        product_type: product.product_type || "",
        size: product.size || "",
        description: product.description || "",
        uom: product.uom || "",
        is_active: product.is_active ?? true,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        product_name: "",
        product_type: "",
        size: "",
        description: "",
        uom: "",
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (editingProduct) {
        const productId = editingProduct.id || editingProduct.product_id;
        if (!productId) {
          alert("Product ID missing. Please refresh and try again.");
          return;
        }
        await productService.updateProduct(productId, formData);
        alert("Product updated successfully!");
      } else {
        await productService.createProduct(formData);
        alert("Product added successfully!");
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      console.error("❌ Error saving product:", err);
      setError(err?.toString?.() || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      setLoading(true);
      await productService.deleteProduct(id);
      alert("Product deleted successfully!");
      loadProducts();
    } catch (err) {
      console.error("❌ Error deleting product:", err);
      alert(err?.toString?.() || "Failed to delete product");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (product) => {
    try {
      const productId = product.id || product.product_id;
      const updated = { ...product, is_active: !product.is_active };
      await productService.updateProduct(productId, { is_active: updated.is_active });
      loadProducts();
    } catch (err) {
      alert("Error updating status");
    }
  };

  const exportToCSV = () => {
    const headers = ["Product Name", "Type", "Size", "UOM", "Description", "Status"];
    const rows = products.map((p) => [
      p.product_name,
      p.product_type || "",
      p.size || "",
      p.uom || "",
      p.description || "",
      p.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "products.csv";
    link.click();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Master</h1>
          <p className="text-gray-600">Manage product catalog with search, pagination & export</p>
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
            <Plus className="w-5 h-5" /> Add Product
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Products</p>
            <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
          </div>
          <Package className="w-12 h-12 text-blue-600" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-green-600">{inactiveCount}</p>
          </div>
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Inactive</p>
            <p className="text-3xl font-bold text-red-600">{activeCount}</p>
          </div>
          <XCircle className="w-12 h-12 text-red-600" />
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
            placeholder="Search products..."
            className="border-0 focus:ring-0 focus:outline-none text-gray-700 w-64"
          />
        </div>
        <p className="text-sm text-gray-500">
          Showing {currentData.length} of {filtered.length} products
        </p>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Product Name", "Category", "Size", "UOM", "Description", "Status", "Actions"].map(
                (head) => (
                  <th
                    key={head}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {head}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-6 text-center text-gray-500 text-sm">
                  No products found.
                </td>
              </tr>
            )}
            {currentData.map((p) => (
              <tr key={p.id || p.product_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.product_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.product_type || "—"}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.size || "—"}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{p.uom || "—"}</td>
                <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{p.description || "—"}</td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => handleToggleActive(p)}
                    className="flex items-center justify-center mx-auto"
                    title={p.is_active ? "Deactivate" : "Activate"}
                  >
                    {p.is_active ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id || p.product_id)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                <input
                  type="text"
                  name="product_type"
                  value={formData.product_type}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
                <input
                  type="text"
                  name="uom"
                  value={formData.uom}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="w-full border rounded-lg px-3 py-2"
                ></textarea>
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
                  {editingProduct ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductMasterPage;
