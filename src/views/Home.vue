<template>
  <div class="home">
    <div class="container">
      <div class="header">
        <h1>🍹 鸡尾酒配方搜索</h1>
        <p>搜索你喜欢的鸡尾酒配方</p>
      </div>
      
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索鸡尾酒名称、配料或标签..."
          @input="searchCocktails"
          class="search-input"
        />
      </div>
      
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else class="cocktails-grid">
        <div
          v-for="cocktail in cocktails"
          :key="cocktail.id"
          class="cocktail-card"
          @click="showDetail(cocktail)"
        >
          <div class="cocktail-image" :style="{ backgroundImage: `url(${cocktail.image || '/placeholder.jpg'})` }">
            <div v-if="!cocktail.image" class="placeholder-icon">🍹</div>
          </div>
          <div class="cocktail-info">
            <h3>{{ cocktail.name }}</h3>
            <p v-if="cocktail.name_en" class="name-en">{{ cocktail.name_en }}</p>
            <p class="description">{{ cocktail.description }}</p>
            <div v-if="cocktail.tags" class="tags">
              <span v-for="tag in cocktail.tags.split(',')" :key="tag" class="tag">
                {{ tag.trim() }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="!loading && cocktails.length === 0" class="empty">
        暂无数据，请前往管理后台添加
      </div>
    </div>
    
    <div v-if="selectedCocktail" class="modal" @click="closeDetail">
      <div class="modal-content" @click.stop>
        <button class="close-btn" @click="closeDetail">×</button>
        <h2>{{ selectedCocktail.name }}</h2>
        <p v-if="selectedCocktail.name_en" class="name-en">{{ selectedCocktail.name_en }}</p>
        <p class="description">{{ selectedCocktail.description }}</p>
        
        <div class="section">
          <h3>配料</h3>
          <div class="ingredients" v-html="formatText(selectedCocktail.ingredients)"></div>
        </div>
        
        <div class="section">
          <h3>制作步骤</h3>
          <div class="steps" v-html="formatText(selectedCocktail.steps)"></div>
        </div>
        
        <div v-if="selectedCocktail.tags" class="section">
          <div class="tags">
            <span v-for="tag in selectedCocktail.tags.split(',')" :key="tag" class="tag">
              {{ tag.trim() }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'Home',
  setup() {
    const cocktails = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const selectedCocktail = ref(null)
    
    const fetchCocktails = async () => {
      try {
        const response = await fetch('/api/cocktails')
        cocktails.value = await response.json()
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        loading.value = false
      }
    }
    
    const searchCocktails = async () => {
      loading.value = true
      try {
        const url = searchQuery.value 
          ? `/api/cocktails?search=${encodeURIComponent(searchQuery.value)}`
          : '/api/cocktails'
        const response = await fetch(url)
        cocktails.value = await response.json()
      } catch (error) {
        console.error('搜索失败:', error)
      } finally {
        loading.value = false
      }
    }
    
    const showDetail = (cocktail) => {
      selectedCocktail.value = cocktail
    }
    
    const closeDetail = () => {
      selectedCocktail.value = null
    }
    
    const formatText = (text) => {
      if (!text) return ''
      return text.replace(/\n/g, '<br>')
    }
    
    onMounted(() => {
      fetchCocktails()
    })
    
    return {
      cocktails,
      loading,
      searchQuery,
      selectedCocktail,
      searchCocktails,
      showDetail,
      closeDetail,
      formatText
    }
  }
}
</script>

<style scoped>
.home {
  min-height: calc(100vh - 60px);
  padding-bottom: 2rem;
}

.header {
  text-align: center;
  padding: 3rem 0;
  color: white;
}

.header h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.search-box {
  max-width: 600px;
  margin: 0 auto 2rem;
}

.search-input {
  width: 100%;
  padding: 1rem 1.5rem;
  font-size: 1.1rem;
  border: none;
  border-radius: 50px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.2);
  outline: none;
  transition: transform 0.3s;
}

.search-input:focus {
  transform: translateY(-2px);
}

.loading {
  text-align: center;
  color: white;
  font-size: 1.2rem;
  padding: 3rem;
}

.cocktails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.cocktail-card {
  background: white;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.cocktail-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.cocktail-image {
  height: 180px;
  background-size: cover;
  background-position: center;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  font-size: 4rem;
}

.cocktail-info {
  padding: 1.5rem;
}

.cocktail-info h3 {
  color: #333;
  margin-bottom: 0.3rem;
}

.name-en {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.description {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.8rem;
}

.empty {
  text-align: center;
  color: white;
  font-size: 1.2rem;
  padding: 3rem;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 2rem;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.modal-content h2 {
  color: #333;
  margin-bottom: 0.5rem;
}

.modal-content .description {
  color: #666;
  margin-bottom: 1.5rem;
}

.section {
  margin-bottom: 1.5rem;
}

.section h3 {
  color: #667eea;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.ingredients, .steps {
  color: #444;
  line-height: 1.8;
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2rem;
  }
  
  .cocktails-grid {
    grid-template-columns: 1fr;
  }
}
</style>