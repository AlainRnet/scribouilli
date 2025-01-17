// @ts-check

import lireFrontMatter from 'front-matter'
import page from 'page'

import store from '../store'
import { handleErrors } from '../utils'

import gitAgent from '../gitAgent'
import { svelteTarget } from '../config'
import { replaceComponent } from '../routeComponentLifeCycle'
import ArticleContenu from '../components/screens/ArticleContenu.svelte'
import { setCurrentRepositoryFromQuerystring } from '../actions/current-repository.js'
import { deleteArticle, createArticle, updateArticle } from '../actions/article'
import { makeAtelierListArticlesURL } from './atelier-list-articles.js'

const LIST_ARTICLE_URL = '/atelier-list-articles'

/**
 *
 * @param {string} fileName
 * @returns {(state: import('../store').ScribouilliState) => any}
 */
const makeMapStateToProps = fileName => state => {
  if (fileName) {
    const currentRepository = store.state.currentRepository

    if (!currentRepository) {
      throw new TypeError('currentRepository is undefined')
    }

    // Display existing file
    const fileP = gitAgent
      .getFile(currentRepository, fileName)
      .then(contenu => {
        const { attributes: data, body: markdownContent } =
          lireFrontMatter(contenu)

        return {
          fileName: fileName,
          content: markdownContent,
          previousContent: markdownContent,
          title: data?.title,
          previousTitle: data?.title,
        }
      })
      .catch(msg => handleErrors(msg))
    return {
      fileP,
      contenus: state.articles,
      buildStatus: state.buildStatus,
      showArticles:
        (state.pages &&
          state.pages.find(p => p.path === 'blog.md') !== undefined) ||
        (state.articles && state.articles.length > 0),
      currentRepository: state.currentRepository,
    }
  } else {
    // Create a new file
    return {
      fileP: Promise.resolve({
        fileName: '',
        content: '',
        previousContent: undefined,
        title: '',
        previousTitle: undefined,
      }),
      contenus: state.articles,
      buildStatus: state.buildStatus,
      showArticles:
        (state.pages &&
          state.pages.find(p => p.path === 'blog.md') !== undefined) ||
        (state.articles && state.articles.length > 0),
      currentRepository: state.currentRepository,
    }
  }
}

/**
 * @param {import('page').Context} _
 */
export default async ({ querystring }) => {
  await setCurrentRepositoryFromQuerystring(querystring)

  const currentRepository = store.state.currentRepository

  if (!currentRepository) {
    throw new TypeError('currentRepository is undefined')
  }

  const state = store.state
  const fileName = new URLSearchParams(querystring).get('path') ?? ''
  const mapStateToProps = makeMapStateToProps(fileName)

  const articleContenu = new ArticleContenu({
    target: svelteTarget,
    props: mapStateToProps(store.state),
  })

  replaceComponent(articleContenu, mapStateToProps)

  articleContenu.$on('delete', () => {
    deleteArticle(fileName)
      .then(() => {
        state.buildStatus.setBuildingAndCheckStatusLater()
        page(makeAtelierListArticlesURL(currentRepository))
      })
      .catch(msg => handleErrors(msg))
  })

  articleContenu.$on(
    'save',
    ({
      detail: { fileName, content, previousContent, title, previousTitle },
    }) => {
      const hasContentChanged = content !== previousContent
      const hasTitleChanged = title !== previousTitle
      const articlePageUrl = makeAtelierListArticlesURL(currentRepository)

      // If no content changed, just redirect
      if (!hasTitleChanged && !hasContentChanged) {
        return page(articlePageUrl)
      }

      // If the file name is empty, it means that we are creating a new article.
      if (fileName === '') {
        return createArticle(title, content)
          .then(() => {
            state.buildStatus.setBuildingAndCheckStatusLater()
            page(articlePageUrl)
          })
          .catch(msg => handleErrors(msg))
      }

      updateArticle(fileName, title, content)
        .then(() => {
          state.buildStatus.setBuildingAndCheckStatusLater()
          page(articlePageUrl)
        })
        .catch(msg => handleErrors(msg))
    },
  )
}
