import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Input, Button, Select } from "@rneui/themed";

const RolePluginScreen = () => {
  const [plugins, setPlugins] = useState([]);
  const [form, setForm] = useState({ role_name: "", screen_name: "" });

  const fetchPlugins = async () => {
    const res = await axios.get("/api/role-plugin");
    setPlugins(res.data);
  };

  const handleSubmit = async () => {
    if (!form.role_name || !form.screen_name) return alert("All fields required!");
    await axios.post("/api/role-plugin", form);
    setForm({ role_name: "", screen_name: "" });
    fetchPlugins();
  };

  useEffect(() => {
    fetchPlugins();
  }, []);

  return (
    <Card containerStyle={{ borderRadius: 12, padding: 20 }}>
      <Card.Title>Role Plugin Management</Card.Title>

      <Select
        label="Select Role"
        value={form.role_name}
        onValueChange={(val) => setForm({ ...form, role_name: val })}
        options={[
          { label: "Super Admin", value: "super_admin" },
          { label: "Admin", value: "admin" },
          { label: "Manager", value: "manager" },
          { label: "Viewer", value: "viewer" },
        ]}
      />

      <Input
        placeholder="Screen Name (e.g., Branches)"
        value={form.screen_name}
        onChangeText={(text) => setForm({ ...form, screen_name: text })}
      />

      <Button title="Add Role Plugin" onPress={handleSubmit} />

      {plugins.map((p) => (
        <Card key={p.role_id} containerStyle={{ marginTop: 15, padding: 10 }}>
          <Card.Title>{p.role_name}</Card.Title>
          <Card.Divider />
          <p>{p.screen_name}</p>
        </Card>
      ))}
    </Card>
  );
};

export default RolePluginScreen;
