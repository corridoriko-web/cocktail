<template>
  <div class="home">
    <div class="container">
      <div class="header">
        <h1>🍹 鸡尾酒配方搜索</h1>
        <p>点击标签筛选，或搜索你喜欢的鸡尾酒</p>
      </div>
      
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索鸡尾酒名称、配料..."
          @input="searchCocktails"
          class="search-input"
        />
      </div>
      
      <div class="tags-section">
        <h3>🏷️ 热门标签</h3>
        <div class="tags-cloud">
          <button
            v-for="tag in tags"
            :key="tag.name"
            :class="['tag-btn', { active: selectedTag === tag.name }]"
            @click="filterByTag(tag.name)"
          >
            {{ tag.name }} <span class="count">{{ tag.count }}</span>
          </button>
        </div>
        <button v-if="selectedTag" class="clear-btn" @click="clearFilter">
          清除筛选
        </button>
      </div>
      
      <div v-if="selectedTag" class="filter-info">
        当前筛选：<strong>{{ selectedTag }}</strong>，共 {{ cocktails.length }} 款鸡尾酒
      </div>
      
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else class="cocktails-grid">
        <div
          v-for="cocktail in cocktails"
          :key="cocktail.id"
          class="cocktail-card"
          @click="showDetail(cocktail)"
        >
          <div class="cocktail-image" :style="{ backgroundImage: cocktail.image ? `url(${cocktail.image})` : '' }">
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
            <a v-if="cocktail.link" :href="cocktail.link" target="_blank" class="link-btn" @click.stop>
              📺 查看制作教程
            </a>
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
        
        <a v-if="selectedCocktail.link" :href="selectedCocktail.link" target="_blank" class="tutorial-link">
          📺 点击查看制作教程
        </a>
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
    const tags = ref([])
    const loading = ref(true)
    const searchQuery = ref('')
    const selectedTag = ref(null)
    const selectedCocktail = ref(null)
    
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags')
        tags.value = await response.json()
      } catch (error) {
        console.error('获取标签失败:', error)
      }
    }
    
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
      selectedTag.value = null
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
    
    const filterByTag = async (tagName) => {
      loading.value = true
      searchQuery.value = ''
      selectedTag.value = tagName
      try {
        const response = await fetch(`/api/cocktails?tag=${encodeURIComponent(tagName)}`)
        cocktails.value = await response.json()
      } catch (error) {
        console.error('筛选失败:', error)
      } finally {
        loading.value = false
      }
    }
    
    const clearFilter = async () => {
      selectedTag.value = null
      searchQuery.value = ''
      loading.value = true
      try {
        const response = await fetch('/api/cocktails')
        cocktails.value = await response.json()
      } catch (error) {
        console.error('获取数据失败:', error)
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
      fetchTags()
      fetchCocktails()
    })
    
    return {
      cocktails,
      tags,
      loading,
      searchQuery,
      selectedTag,
      selectedCocktail,
      searchCocktails,
      filterByTag,
      clearFilter,
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
  padding: 2rem 0;
  color: white;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.header p {
  font-size: 1.1rem;
  opacity: 0.9;
}

.search-box {
  max-width: 600px;
  margin: 0 auto 1.5rem;
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

.tags-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.tags-section h3 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.tag-btn:hover {
  transform: scale(1.05);
}

.tag-btn.active {
  background: #e74c3c;
  transform: scale(1.05);
}

.tag-btn .count {
  background: rgba(255,255,255,0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-left: 0.3rem;
}

.clear-btn {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.filter-info {
  background: rgba(255, 255, 255, 0.9);
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  margin-bottom: 1rem;
  text-align: center;
  color: #333;
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
  height: 160px;
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
  padding: 1.25rem;
}

.cocktail-info h3 {
  color: #333;
  margin-bottom: 0.25rem;
}

.name-en {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.description {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.tag {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.link-btn {
  display: inline-block;
  background: #e74c3c;
  color: white;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  text-decoration: none;
  margin-top: 0.5rem;
}

.link-btn:hover {
  background: #c0392b;
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
  display: block;
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

.tutorial-link {
  display: inline-block;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 500;
  margin-top: 1rem;
}

.tutorial-link:hover {
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 1.8rem;
  }
  
  .cocktails-grid {
    grid-template-columns: 1fr;
  }
  
  .tags-cloud {
    gap: 0.4rem;
  }
  
  .tag-btn {
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }
}
</style>