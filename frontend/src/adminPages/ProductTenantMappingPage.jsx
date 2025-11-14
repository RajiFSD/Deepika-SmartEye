import { useState, useEffect } from "react";
import {
  Link2,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";

import productTenantMappingService from "../services/productTenantMappingService";
import productService from "../services/productService";
import tenantService from "../services/tenantService";
import cameraService from "../services/cameraService";
import adminService from "../services/adminService";
import productConfigService from "../services/productConfigService";

function ProductTenantMappingPage() {
  const [tenants, setTenants] = useState([]);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [configurations, setConfigurations] = useState([]);
  const [mappings, setMappings] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Get logged-in user ID from localStorage
  const userId = localStorage.getItem('user') 
    ? JSON.parse(localStorage.getItem('user')).id 
    : null;

  const [formData, setFormData] = useState({
    tenant_id: "",
    branch_id: "",
    camera_id: "",
    user_id: userId || "", // Set default user_id
    product_id: "",
    configuration_id: "",
    is_active: true,
  });

  // INITIAL LOAD
  useEffect(() => {
    loadTenants();
    loadProducts();
    loadConfigurations();
    loadMappings();
  }, []);

  // LOAD TENANTS
  const loadTenants = async () => {
    try {
      const response = await tenantService.getAllTenants();
      const list = response?.data?.data?.tenants || response?.data?.tenants || response?.tenants || [];
      setTenants(list);
    } catch (err) {
      console.error("Failed to load tenants", err);
      setTenants([]);
    }
  };

  // LOAD PRODUCTS
  const loadProducts = async () => {
    try {
      const response = await productService.getProducts();
      const list = response?.data?.products || response?.data || response || [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products", err);
      setProducts([]);
    }
  };

  // LOAD BRANCHES BY TENANT
  const loadBranchesByTenant = async (tenantId) => {
    if (!tenantId) {
      setBranches([]);
      return;
    }
    
    try {
      const response = await adminService.getBranchesByTenant(tenantId);
      console.log("Branches response:", response);
      const list = response?.data || response?.data?.data || response?.data?.data?.branches || response?.data?.branches || response?.branches || [];
      console.log("Branches list:", list);
      setBranches(list);
    } catch (err) {
      console.error("Failed to load branches", err);
      setBranches([]);
    }
  };

  // LOAD CAMERAS BY BRANCH
  const loadCamerasByBranch = async (branchId) => {
    if (!branchId) {
      setCameras([]);
      return;
    }
    
    try {
      const response = await cameraService.getCamerasByBranch(branchId);
      console.log("Cameras response:", response);
      const list = response?.data?.data?.cameras || response?.data?.cameras || response?.cameras || [];
      setCameras(list);
    } catch (err) {
      console.error("Failed to load cameras", err);
      setCameras([]);
    }
  };

  // LOAD CONFIGURATIONS
  const loadConfigurations = async () => {
    try {
      const response = await productConfigService.getConfigs();
      const list = response?.data?.data?.configurations || response?.data?.configurations || response?.configurations || [];
      setConfigurations(list);
    } catch (err) {
      console.error("Failed to load configurations", err);
      setConfigurations([]);
    }
  };

  // LOAD MAPPINGS
  const loadMappings = async () => {
    try {
      const list = await productTenantMappingService.getMappings();
      console.log("Final Mappings:", list);
      setMappings(list);
    } catch (err) {
      console.error("Failed to load mappings", err);
      setMappings([]);
    }
  };

  // OPEN MODAL
  const handleOpenModal = async (mapping = null) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        tenant_id: mapping.tenant_id || "",
        branch_id: mapping.branch_id || "",
        camera_id: mapping.camera_id || "",
        user_id: mapping.user_id || userId || "",
        product_id: mapping.product_id || "",
        configuration_id: mapping.configuration_id || "",
        is_active: mapping.is_active ?? true,
      });
      
      // Load branches and cameras for editing
      if (mapping.tenant_id) {
        await loadBranchesByTenant(mapping.tenant_id);
      }
      if (mapping.branch_id) {
        await loadCamerasByBranch(mapping.branch_id);
      }
    } else {
      setEditingMapping(null);
      setFormData({
        tenant_id: "",
        branch_id: "",
        camera_id: "",
        user_id: userId || "", // Set default user_id for new mapping
        product_id: "",
        configuration_id: "",
        is_active: true,
      });
      // Clear dependent dropdowns
      setBranches([]);
      setCameras([]);
    }
    setShowModal(true);
  };

  // SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        tenant_id: Number(formData.tenant_id),
        branch_id: Number(formData.branch_id),
        camera_id: Number(formData.camera_id),
        user_id: Number(formData.user_id),
        product_id: Number(formData.product_id),
        configuration_id: formData.configuration_id ? Number(formData.configuration_id) : null,
        is_active: formData.is_active,
      };

      if (editingMapping) {
        await productTenantMappingService.updateMapping(editingMapping.id, submitData);
        alert("Mapping updated!");
      } else {
        await productTenantMappingService.createMapping(submitData);
        alert("Mapping added!");
      }

      setShowModal(false);
      loadMappings();
    } catch (err) {
      console.error("Failed to save mapping:", err);
      alert("Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  // DELETE
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await productTenantMappingService.deleteMapping(id);
      loadMappings();
    } catch (err) {
      alert("Failed to delete mapping");
    }
  };

  // FORM CHANGE - Updated to handle cascading dropdowns
  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    
    let newValue = value;
    if (name === 'tenant_id' || name === 'branch_id' || name === 'camera_id' || 
        name === 'user_id' || name === 'product_id' || name === 'configuration_id') {
      newValue = value === '' ? '' : Number(value);
    } else if (type === "checkbox") {
      newValue = checked;
    }
    
    // Update form data
    const updatedFormData = {
      ...formData,
      [name]: newValue,
    };
    
    // Handle cascading dropdowns
    if (name === 'tenant_id') {
      // Reset dependent fields
      updatedFormData.branch_id = '';
      updatedFormData.camera_id = '';
      setCameras([]);
      
      // Load branches for selected tenant
      if (value) {
        await loadBranchesByTenant(Number(value));
      } else {
        setBranches([]);
      }
    } else if (name === 'branch_id') {
      // Reset camera field
      updatedFormData.camera_id = '';
      
      // Load cameras for selected branch
      if (value) {
        await loadCamerasByBranch(Number(value));
      } else {
        setCameras([]);
      }
    }
    
    setFormData(updatedFormData);
    console.log('Form Data Updated:', name, newValue);
  };

  // COUNTS
  const totalCount = mappings.length;
  const activeCount = mappings.filter((m) => m.is_active).length;
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Product-Tenant Mapping
          </h1>
          <p className="text-gray-600">
            Assign products to tenants with complete configuration.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" /> Add Mapping
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Mappings</p>
            <p className="text-3xl font-bold text-gray-900">{totalCount}</p>
          </div>
          <Link2 className="w-12 h-12 text-blue-600" />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </div>
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Inactive</p>
            <p className="text-3xl font-bold text-red-600">{inactiveCount}</p>
          </div>
          <XCircle className="w-12 h-12 text-red-600" />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Tenant", "Branch", "Camera", "Product", "Configuration", "Status", "Actions"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-6 text-center text-gray-500 text-sm"
                >
                  No mappings found.
                </td>
              </tr>
            )}

            {mappings.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-700">
                  {m.tenant_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {m.branch_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {m.camera_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {m.product_name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                  {m.configuration_name || 'N/A'}
                </td>
                <td className="px-6 py-4">
                  {m.is_active ? (
                    <ToggleRight className="w-6 h-6 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleOpenModal(m)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(m.id)}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-lg">
                {editingMapping ? "Edit Mapping" : "Add Mapping"}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Tenant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant *
                </label>
                <select
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Tenant</option>
                  {tenants.map((t) => (
                    <option key={t.tenant_id} value={t.tenant_id}>
                      {t.tenant_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch *
                </label>
                <select
                  name="branch_id"
                  value={formData.branch_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.tenant_id}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.tenant_id ? "Select Branch" : "Select Tenant First"}
                  </option>
                  {branches.map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Camera *
                </label>
                <select
                  name="camera_id"
                  value={formData.camera_id}
                  onChange={handleChange}
                  required
                  disabled={!formData.branch_id}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {formData.branch_id ? "Select Camera" : "Select Branch First"}
                  </option>
                  {cameras.map((c) => (
                    <option key={c.camera_id} value={c.camera_id}>
                      {c.camera_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User ID - Hidden field with default value */}
              <input
                type="hidden"
                name="user_id"
                value={formData.user_id}
              />

              {/* Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Configuration (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Configuration
                </label>
                <select
                  name="configuration_id"
                  value={formData.configuration_id}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Configuration (Optional)</option>
                  {configurations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.config_name || `Configuration ${c.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:bg-blue-400"
                >
                  <Save className="w-4 h-4" />
                  {loading ? "Saving..." : (editingMapping ? "Update" : "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductTenantMappingPage;