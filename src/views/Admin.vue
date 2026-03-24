<template>
  <div class="admin">
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-box">
        <h2>管理后台登录</h2>
        <form @submit.prevent="login">
          <div class="form-group">
            <label>请输入管理密码</label>
            <input 
              v-model="password" 
              type="password" 
              placeholder="输入密码" 
              required 
              autofocus
            />
          </div>
          <button type="submit" class="btn-login">登录</button>
          <p v-if="loginError" class="error">{{ loginError }}</p>
        </form>
      </div>
    </div>
    
    <div v-else class="container">
      <div class="admin-header">
        <h1>管理后台</h1>
        <button class="btn-logout" @click="logout">退出登录</button>
      </div>
      
      <div class="tabs">
        <button :class="{ active: activeTab === 'list' }" @click="activeTab = 'list'">配方列表</button>
        <button :class="{ active: activeTab === 'add' }" @click="activeTab = 'add'">添加配方</button>
        <button :class="{ active: activeTab === 'replace' }" @click="activeTab = 'replace'">批量替换</button>
      </div>
      
      <div v-if="activeTab === 'list'" class="tab-content">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else class="list">
          <div v-for="cocktail in cocktails" :key="cocktail.id" class="list-item">
            <div class="item-info">
              <h3>{{ cocktail.name }}</h3>
              <p v-if="cocktail.name_en">{{ cocktail.name_en }}</p>
            </div>
            <div class="item-actions">
              <button class="btn-edit" @click="editCocktail(cocktail)">编辑</button>
              <button class="btn-delete" @click="deleteCocktail(cocktail.id)">删除</button>
            </div>
          </div>
          <div v-if="cocktails.length === 0" class="empty">暂无数据</div>
        </div>
      </div>
      
      <div v-if="activeTab === 'add' || activeTab === 'edit'" class="tab-content">
        <form @submit.prevent="saveCocktail" class="form">
          <div class="form-group">
            <label>名称（必填）</label>
            <input v-model="form.name" type="text" required />
          </div>
          
          <div class="form-group">
            <label>英文名称</label>
            <input v-model="form.name_en" type="text" />
          </div>
          
          <div class="form-group">
            <label>配料（必填，每行一个）</label>
            <textarea v-model="form.ingredients" rows="5" required></textarea>
          </div>
          
          <div class="form-group">
            <label>制作步骤（必填，每行一个步骤）</label>
            <textarea v-model="form.steps" rows="8" required></textarea>
          </div>
          
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="form.description" rows="3"></textarea>
          </div>
          
          <div class="form-group">
            <label>图片URL</label>
            <input v-model="form.image" type="url" />
          </div>
          
          <div class="form-group">
            <label>标签（逗号分隔）</label>
            <input v-model="form.tags" type="text" placeholder="清爽, 甜, 夏季" />
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">
              {{ activeTab === 'edit' ? '更新' : '添加' }}
            </button>
            <button v-if="activeTab === 'edit'" type="button" class="btn-secondary" @click="cancelEdit">
              取消
            </button>
          </div>
        </form>
      </div>
      
      <div v-if="activeTab === 'replace'" class="tab-content">
        <div class="replace-form">
          <h3>批量文字替换</h3>
          <p class="hint">在所有配方中查找并替换文字内容</p>
          
          <div class="form-group">
            <label>查找文本</label>
            <input v-model="findText" type="text" placeholder="要查找的文字" />
          </div>
          
          <div class="form-group">
            <label>替换为</label>
            <input v-model="replaceText" type="text" placeholder="替换后的文字" />
          </div>
          
          <button class="btn-primary" @click="replaceText">执行替换</button>
          
          <div v-if="replaceResult" class="result">{{ replaceResult }}</div>
        </div>
      </div>
      
      <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'Admin',
  setup() {
    const ADMIN_PASSWORD = 'Jump123456'
    
    const isLoggedIn = ref(false)
    const password = ref('')
    const loginError = ref('')
    
    const activeTab = ref('list')
    const cocktails = ref([])
    const loading = ref(false)
    const message = ref('')
    const messageType = ref('success')
    const findText = ref('')
    const replaceText = ref('')
    const replaceResult = ref('')
    
    const form = ref({
      id: null,
      name: '',
      name_en: '',
      ingredients: '',
      steps: '',
      description: '',
      image: '',
      tags: ''
    })
    
    const login = () => {
      if (password.value === ADMIN_PASSWORD) {
        isLoggedIn.value = true
        loginError.value = ''
        sessionStorage.setItem('adminAuth', 'true')
        fetchCocktails()
      } else {
        loginError.value = '密码错误，请重试'
        password.value = ''
      }
    }
    
    const logout = () => {
      isLoggedIn.value = false
      sessionStorage.removeItem('adminAuth')
      password.value = ''
      activeTab.value = 'list'
    }
    
    const checkAuth = () => {
      if (sessionStorage.getItem('adminAuth') === 'true') {
        isLoggedIn.value = true
        fetchCocktails()
      }
    }
    
    const fetchCocktails = async () => {
      loading.value = true
      try {
        const response = await fetch('/api/cocktails')
        cocktails.value = await response.json()
      } catch (error) {
        showMessage('获取数据失败', 'error')
      } finally {
        loading.value = false
      }
    }
    
    const showMessage = (msg, type = 'success') => {
      message.value = msg
      messageType.value = type
      setTimeout(() => {
        message.value = ''
      }, 3000)
    }
    
    const saveCocktail = async () => {
      try {
        const url = form.value.id 
          ? `/api/cocktails/${form.value.id}`
          : '/api/cocktails'
        
        const method = form.value.id ? 'PUT' : 'POST'
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form.value)
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error)
        }
        
        showMessage(data.message)
        resetForm()
        activeTab.value = 'list'
        fetchCocktails()
      } catch (error) {
        showMessage(error.message, 'error')
      }
    }
    
    const editCocktail = (cocktail) => {
      form.value = { ...cocktail }
      activeTab.value = 'edit'
    }
    
    const cancelEdit = () => {
      resetForm()
      activeTab.value = 'list'
    }
    
    const deleteCocktail = async (id) => {
      if (!confirm('确定要删除这个配方吗？')) return
      
      try {
        const response = await fetch(`/api/cocktails/${id}`, {
          method: 'DELETE'
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error)
        }
        
        showMessage(data.message)
        fetchCocktails()
      } catch (error) {
        showMessage(error.message, 'error')
      }
    }
    
    const replaceTextInAll = async () => {
      try {
        const response = await fetch('/api/replace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            findText: findText.value,
            replaceText: replaceText.value
          })
        })
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error)
        }
        
        replaceResult.value = data.message
        fetchCocktails()
      } catch (error) {
        replaceResult.value = error.message
      }
    }
    
    const resetForm = () => {
      form.value = {
        id: null,
        name: '',
        name_en: '',
        ingredients: '',
        steps: '',
        description: '',
        image: '',
        tags: ''
      }
    }
    
    onMounted(() => {
      checkAuth()
    })
    
    return {
      isLoggedIn,
      password,
      loginError,
      login,
      logout,
      activeTab,
      cocktails,
      loading,
      message,
      messageType,
      form,
      findText,
      replaceText,
      replaceResult,
      saveCocktail,
      editCocktail,
      cancelEdit,
      deleteCocktail,
      replaceText: replaceTextInAll
    }
  }
}
</script>

<style scoped>
.admin {
  min-height: calc(100vh - 60px);
  padding-bottom: 2rem;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.login-box {
  background: white;
  padding: 2.5rem;
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  max-width: 400px;
  width: 90%;
}

.login-box h2 {
  text-align: center;
  color: #333;
  margin-bottom: 1.5rem;
}

.btn-login {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.3s;
}

.btn-login:hover {
  transform: translateY(-2px);
}

.btn-logout {
  padding: 0.5rem 1rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
}

.error {
  color: #e74c3c;
  text-align: center;
  margin-top: 1rem;
}

.container {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  margin-top: 2rem;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.admin-header h1 {
  color: #333;
  margin: 0;
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 1rem;
}

.tabs button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: #f0f0f0;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s;
}

.tabs button.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.item-info h3 {
  color: #333;
  margin-bottom: 0.25rem;
}

.item-info p {
  color: #888;
  font-size: 0.9rem;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit, .btn-delete, .btn-primary, .btn-secondary {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-edit {
  background: #667eea;
  color: white;
}

.btn-delete {
  background: #e74c3c;
  color: white;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.form {
  max-width: 600px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-actions {
  display: flex;
  gap: 1rem;
}

.replace-form {
  max-width: 500px;
}

.replace-form h3 {
  color: #333;
  margin-bottom: 0.5rem;
}

.hint {
  color: #888;
  margin-bottom: 1.5rem;
}

.result {
  margin-top: 1rem;
  padding: 1rem;
  background: #f0f0f0;
  border-radius: 10px;
  color: #333;
}

.message {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 2rem;
  border-radius: 10px;
  color: white;
  font-weight: 500;
  animation: slideIn 0.3s ease;
}

.message.success {
  background: #27ae60;
}

.message.error {
  background: #e74c3c;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.empty {
  text-align: center;
  padding: 2rem;
  color: #888;
}

@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .admin-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .tabs {
    flex-wrap: wrap;
  }
  
  .list-item {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>