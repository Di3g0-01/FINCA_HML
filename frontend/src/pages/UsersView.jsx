import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Users, Key, Eye, EyeOff } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperuser = currentUser.role === 'SUPERUSER';

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/users');
      let fetchedUsers = res.data;
      if (!isSuperuser) {
        fetchedUsers = fetchedUsers.filter(u => u.role !== 'SUPERUSER');
      }
      setUsers(fetchedUsers);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openForm = (u = null) => {
    setUserToEdit(u);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, username) => {
    if (username === 'admin') {
      CustomAlert.info(
        'Aviso',
        'Error: No se puede eliminar el usuario administrador principal por seguridad.',
      );
      return;
    }
    if (
      (
        await CustomAlert.confirm(
          `¿Estás seguro de eliminar al usuario ${username}? No podrá iniciar sesión nuevamente.`,
        )
      ).isConfirmed
    ) {
      try {
        await axios.delete(`/users/${id}`);
        fetchUsers();
      } catch (e) {
        CustomAlert.info(
          'Aviso',
          e.response?.data?.message || 'Error eliminando usuario.',
        );
      }
    }
  };

  return (
    <div className="fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2rem',
              marginBottom: '8px',
              color: '#9C27B0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span className="mobile-only"><Users size={32} /></span> <span className="desktop-only">Gestión de Usuarios</span></h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Controle quién tiene acceso y permisos en el sistema.
          </p>
        </div>
        {isSuperuser && (
          <button
            className="btn-primary"
            style={{
              background: '#9C27B0',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={() => openForm(null)}
          >
            <span className="mobile-only"><Plus size={20} /></span> <span className="desktop-only">Crear Usuario</span></button>
        )}
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Cargando usuarios...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    ID
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Usuario (Nick)
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Rol
                  </th>
                  {isSuperuser && (
                    <th
                      style={{
                        padding: '16px',
                        color: 'var(--text-muted)',
                        fontWeight: '500',
                      }}
                    >
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <td
                        style={{ padding: '16px', color: 'var(--text-muted)' }}
                      >
                        {u.id}
                      </td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>
                        {u.username}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            background:
                              u.role === 'ADMIN'
                                ? 'rgba(156, 39, 176, 0.2)'
                                : 'rgba(33, 150, 243, 0.1)',
                            color: u.role === 'ADMIN' ? '#e040fb' : '#2196F3',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      {isSuperuser && (
                        <td
                          style={{ padding: '16px', display: 'flex', gap: '8px' }}
                        >
                          <button
                            style={{
                              background: 'transparent',
                              color: '#2196F3',
                              padding: '6px',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            onClick={() => openForm(u)}
                            title="Cambiar Contraseña / Editar"
                          >
                            <Key size={18} />
                          </button>
                          {u.username !== 'admin' && (
                            <button
                              style={{
                                background: 'transparent',
                                color: 'var(--danger-color)',
                                padding: '6px',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              onClick={() => handleDelete(u.id, u.username)}
                              title="Eliminar Acceso"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchUsers}
        userToEdit={userToEdit}
      />
    </div>
  );
}

function UserFormModal({ isOpen, onClose, onSaved, userToEdit }) {
  const [formData, setFormData] = useState({
    username: '',
    password_hash: '',
    role: 'OPERADOR',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        username: userToEdit.username,
        password_hash: '',
        role: userToEdit.role || 'OPERADOR',
      });
    } else {
      setFormData({ username: '', password_hash: '', role: 'OPERADOR' });
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (userToEdit && !payload.password_hash) {
        delete payload.password_hash; // No encriptar vacío si se edita y no se cambia
      }

      if (userToEdit) {
        await axios.patch(
          `/users/${userToEdit.id}`,
          payload,
        );
      } else {
        await axios.post('/users', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      CustomAlert.info(
        'Aviso',
        err.response?.data?.message || 'Ocurrió un error guardando el usuario',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay fade-in">
      <div className="premium-card modal-content" style={{ maxWidth: '500px' }}>
        <h2
          style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#9C27B0' }}
        >
          {userToEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          {userToEdit
            ? 'Modifica los accesos o cambia la contraseña.'
            : 'Crea un nuevo usuario de sistema.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Usuario (ID de Entrada)
            </label>
            <input
              type="text"
              className="input-field"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              disabled={userToEdit && userToEdit.username === 'admin'}
            />
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Contraseña {userToEdit && '(Déjalo vacío para no cambiar)'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="input-field"
                style={{ width: '100%', paddingRight: '40px' }}
                value={formData.password_hash}
                onChange={(e) =>
                  setFormData({ ...formData, password_hash: e.target.value })
                }
                required={!userToEdit}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Rol del Sistema
            </label>
            <CustomSelect
              name="role"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              disabled={userToEdit && userToEdit.username === 'admin'}
              options={[
                { label: 'Usuario Operador', value: 'OPERADOR' },
                { label: 'Administrador', value: 'ADMIN' },
              ]}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '16px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ background: '#9C27B0' }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Guardando...'
                : userToEdit
                  ? 'Guardar Cambios'
                  : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
