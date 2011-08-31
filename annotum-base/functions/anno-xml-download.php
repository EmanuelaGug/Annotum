<?php 

class Anno_XML_Download {
	
	static $instance;
	
	private function __construct() {
		/* Define what our "action" is that we'll 
		listen for in our request handlers */
		$this->action = 'anno_xml_download_action';
		$this->i18n = 'anno';
	}
	
	public function i() {
		if (!isset(self::$instance)) {
			self::$instance = new Anno_XML_Download;
		}
		return self::$instance;
	}
	
	public function setup_filterable_props() {
		$this->debug = apply_filters(__CLASS__.'_debug', false);
	}
	
	public function add_actions() {
		add_action('init', array($this, 'setup_filterable_props'));
		add_action('init', array($this, 'request_handler'));
	}
	
	public function request_handler() {
		if (isset($_GET[$this->action])) {
			switch ($_GET[$this->action]) {
				case 'download_xml':
					if (empty($_GET['article'])) {
						wp_die(__('Required article first.', $this->i18n));
					}
					else {
						$article_id = $_GET['article'];
					}
					
					// If we're not debugging, turn off errors
					if (!$this->debug) {
						$display_errors = ini_get('display_errors');
						ini_set('display_errors', 0);
					}
					
					$article = get_post($article_id);
					
					if (!$article) {
						wp_die(__('Required article first.', $this->i18n));
					}
					
		
					header("content-type:text/xml;charset=utf-8");
					$this->generate_xml($article);
					exit;
					break;				
				default:
					break;
			}
		}
	}
	
	
	private function generate_xml($article) {
		echo $this->xml_front($article)."\n".$this->xml_body($article)."\n".$this->xml_back($article);
	}
	
	private function xml_front($article) {
		$journal_title = cfct_get_option('journal_name');
		if (!empty($journal_title)) {
			$journal_title_xml = '<journal-title-group>
					<journal-title>'.esc_html($journal_title).'</journal-title>
				</journal-title-group>';
		}
		else {
			$journal_title_xml = '';
		}
		
		$journal_id = cfct_get_option('journal_id');
		if (!empty($journal_id)) {
			$journal_id_type = cfct_get_option('journal_id_type');
			if (!empty($journal_id_type)) {
				$journal_id_type_xml = ' journal-id-type="'.esc_attr($journal_id_type).'"';
			}
			else {
				$journal_id_type_xml = '';
			}
			
			$journal_id_xml = '<journal-id'.$journal_id_type_xml.'>'.esc_html($journal_id).'</journal-id>';
		}
		else {
			$journal_id_xml = '';
		}
		
		$pub_issn = cfct_get_option('publisher_issn');
		if (!empty($pub_issn)) {
			$pub_issn_xml = '<issn pub-type="ppub">'.esc_html($pub_issn).'</issn>';
		}
		else {
			$pub_issn_xml = '';
		}
		
		$abstract = get_post_meta($article->ID, '_anno_abstract', true);
		if (!empty($abstract)) {
			$abstract_xml = '<abstract>
					<title>'._x('Abstract', 'xml abstract title', 'anno').'</title>
					<p>'.esc_html($abstract).'</p>
				</abstract>';
		}
		else {
			$abstract_xml = '';
		}
		
		$funding = get_post_meta($article->ID, '_anno_funding', true);
		if (!empty($funding)) {
			$funding_xml = '<funding-group>
					<funding-statement><bold>'.esc_html($funding).'</bold></funding-statement>
				</funding-group>';
		}
		else {
			$funding_xml = '';
		}
		
		$doi = get_post_meta($article->ID, '_anno_doi', true);
		if (!empty($doi)) {
			$doi_xml = '<article-id pub-id-type="doi">'.esc_html($doi).'</article-id>';
		}
		else {
			$doi_xml = '';
		}

		$cats = wp_get_object_terms($article->ID, 'article_category');
		if (!empty($cats) && is_array($cats)) {
			$category = get_category($cats[0]); 
			if (!empty($category)) {
				$category_xml = '<article-categories>
				<subj-group>
					<subject><bold>'.$category->name.'</bold></subject>
				</subj-group>
			</article-categories>';
			}
			else {
				$category_xml = '';	
			}
		}
		else {
			$category_xml = '';
		}
		
		$subtitle =  get_post_meta($article->ID, '_anno_subtitle', true);
		$title_xml = '<title-group>';
		if (!empty($article->post_title) || !empty($subtitle)) {
			$title_xml = '<title-group>';
			if (!empty($article->post_title)) {
				$title_xml .= '
				<article-title><bold>'.esc_html($article_post).'</bold></article-title>';
			}
			else {
				$title_xml .= '
				<article-title />';
			}
			if (!empty($subtitle)) {
				$title_xml .= '
				<subtitle><bold>'.esc_html($subtitle).'</bold></subtitle>';
			}
		}
		$title_xml .= '
			</title-group>';
		
		
		$pub_name = cfct_get_option('publisher_name');
		$pub_loc = cfct_get_option('publisher_location');
		if (!empty($pub_name) || !empty($pub_loc)) {
			$publisher_xml = '<publisher>';
			if (!empty($pub_name)) {
				$publisher_xml .= '
				<publisher-name>'.esc_html($pub_name).'</publisher-name>';
			}
			
			if (!empty($pub_loc)) {
				$publisher_xml .= '
				<publisher-loc>'.esc_html($pub_loc).'</publisher-loc>';
			}
			$publisher_xml .= '
					</publisher>';
		}
		else {
			$publisher_xml = '';
		}
		
		$pub_date = $article->post_date;
		if (!empty($pub_date)) {
			$pub_date = strtotime($pub_date);
			$pub_date_xml = '
				<pub-date pub-type="ppub">
					<day>'.date('j', $pub_date).'</day>
					<month>'.date('n', $pub_date).'</month>
					<year>'.date('Y', $pub_date).'</year>
				</pub-date>';
		}
		else {
			$pub_date_xml = '<pub-date />';
		}
		
		$authors = get_post_meta($article->ID, '_anno_author_snapshot', true);
		$author_xml = '<contrib-group>';
		if (!empty($authors) && is_array($authors)) {
			foreach ($authors as $author) {
				$author_xml .= '
				<contrib>';
				if (
					(isset($author['surname']) && !empty($author['surname'])) ||
					(isset($author['given_names']) && !empty($author['given_names'])) ||
					(isset($author['prefix']) && !empty($author['prefix'])) ||
					(isset($author['suffix']) && !empty($author['suffix']))
					) {
						$author_xml .= '
					<name>';
						if (isset($author['surname']) && !empty($author['surname'])) {
							$author_xml .= '
						<surname>'.esc_html($author['surname']).'</surname>';
						}
						if (isset($author['given_names']) && !empty($author['given_names'])) {
							$author_xml .= '
						<given-names>'.esc_html($author['given_names']).'</given-names>';
						}
						if (isset($author['prefix']) && !empty($author['prefix'])) {
							$author_xml .= '
						<prefix>'.esc_html($author['prefix']).'</prefix>';
						}
						if (isset($author['suffix']) && !empty($author['suffix'])) {
							$author_xml .= '
						<suffix>'.esc_html($author['suffix']).'</suffix>';
						}
						$author_xml .= '
					</name>';
					}
					
					if (isset($author['degrees']) && !empty($author['degrees'])) {
						$author_xml .= '
						<degrees>'.esc_html($author['degrees']).'</degrees>';
					}
					
					if (isset($author['email']) && !empty($author['email'])) {
						$author_xml .= '
						<email>'.esc_html($author['email']).'</email>';
					}
					
					if (isset($author['affiliation']) && !empty($author['affitliation'])) {
						$author_xml .= '
						<affiliation>'.esc_html($author['affiliation']).'</affiliation>';
					}
					
					if (isset($author['bio']) && !empty($author['bio'])) {
						$author_xml .= '
						<bio>'.esc_html($author['bio']).'</bio>';
					}			
						
					if (isset($author['link']) && !empty($author['link'])) {
						$author_xml .= '
						<ext-link ext-link-type="uri" xlink:href="'.esc_url($author['link']).'">'.esc_html($author['link']).'</ext-link>';
					}
				
				$author_xml .= '
				</contrib>';
			}
		
		}
		$author_xml .= '
		</contrib-group>';
		
//@TODO abstract out journal meta, article meta to their own methods
			return 
'<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE article SYSTEM "http://dtd.nlm.nih.gov/ncbi/kipling/kipling-jp3.dtd">
<article xmlns:xlink="http://www.w3.org/1999/xlink" article-type="research-article" xml:lang="en">
	<front>
		<journal-meta>
			'.$journal_id_xml.'
			'.$journal_title_xml.'
			'.$pub_issn_xml.'
			'.$publisher_xml.'
		</journal-meta>
		<article-meta>
			'.$doi_xml.'
			'.$category_xml.'
			'.$title_xml.'
			'.$author_xml.'
			'.$pub_date_xml.
//			<history>
//				<date date-type="submitted">
//					<day>12</day>
//					<month>12</month>
//					<year>2010</year>
//				</date>
//				<date date-type="submitted">
//					<day>12</day>
//					<month>12</month>
//					<year>2010</year>
//				</date>
//			</history>
'			'.$abstract_xml.
//			<kwd-group kwd-group-type="simple">
//				<kwd><bold>Formatted Text</bold></kwd>
//				<kwd><bold>Formatted Text</bold></kwd>
///				<kwd><bold>Formatted Text</bold></kwd>
//				<kwd><bold>Formatted Text</bold></kwd>
//				<kwd><bold>Formatted Text</bold></kwd>
//				<kwd><bold>Formatted Text</bold></kwd>
//			</kwd-group>
'
			'.$funding_xml.'
		</article-meta>
	</front>';
	}
	
	private function xml_body($article) {
		$body = $article->post_content_filtered;		
		return 
'	<body>
		'.$body.'	
	</body>';
	}
	
	private function xml_acknoledgements($article) {
		$ack = get_post_meta($article->ID, '_anno_acknowledgements', true);
		$xml = '';
		if (!empty($ack)) {
			$xml =
'		<ack>
			<title>'._x('Acknowledgments', 'xml acknowledgments title', 'anno').'</title>
			<p>'.esc_html($ack).'</p>
		</ack>';
		}
		
		return $xml;
	}

	private function xml_appendices($article) {
		$appendices = get_post_meta($article->ID, '_anno_appendices', true);
		$xml = '';
		if (!empty($appendices) && is_array($appendices)) {
			$xml = 
'			<app-group>';

			foreach ($appendices as $appendix_key => $appendix) {
				if (!empty($appendix)) {
					$xml .='
				<app id="app'.($appendix_key + 1).'">
					<title>'.sprintf(_x('Appendix %s', 'xml appendix title', 'anno'), anno_index_alpha($appendix_key)).'</title>'
					.$appendix.'
				</app>';
				}
			}
			
			$xml .='
			</app-group>';
		}
			
		return $xml;
	}
	
	private function xml_references($article) {
		$references = get_post_meta($article->ID, '_anno_references', true);
		$xml = '';
		if (!empty($references) && is_array($references)) {
			$xml = 
'			<ref-list>
				<title>'._x('References', 'xml reference title', 'anno').'</title>';
		
			foreach ($references as $ref_key => $reference) {
				if (isset($reference['doi']) && !empty($reference['doi'])) {
					$doi = '
						<pub-id pub-id-type="doi">'.esc_html($reference['doi']).'</pub-id>';
				}
				else {
					$doi = '';
				}
				
				if (isset($reference['pcmid']) && !empty($reference['pcmid'])) {
					$pcmid = '
						<pub-id pub-id-type="pmid">'.esc_html($reference['pcmid']).'</pub-id>';
				}
				else {
					$pcmid = '';
				}
				
				if (isset($reference['text']) && !empty($reference['text'])) {
					$text = esc_html($reference['text']);
				}
				else {
					$text = '';
				}
					
				if (isset($reference['link']) && !empty($reference['link'])) {
					$link = ' xlink:href="'.esc_url($reference['link']).'"';
				}
				else {
					$link = '';
				}
				
				$xml .='
			<ref id="R'.$ref_key.'">
				<label>'.$ref_key.'</label>
				<mixed-citation'.$link.'>'.$text.'
					'.$doi.$pcmid.'
				</mixed-citation>
			</ref>';

			}
		
			$xml .='
		</ref-list>';
		}
		
		return $xml;
		
	}
	
	private function xml_back($article) {
		return 
'	<back>
'.$this->xml_acknoledgements($article).'
'.$this->xml_appendices($article).'
'.$this->xml_references($article).'
	</back>'."\n".
//	<response response-type="sample">
//		[TBD]
//	</response>
'</article>';	
	}
	
	/**
	 * Generates the XML download URL for a post
	 *
	 * @param int $id 
	 * @return string
	 */
	public function get_download_url($id = null) {
		// Default to the global $post
		if (is_null($id)) {
			global $post;
			if (empty($post)) {
				$this->log('There is no global $post in scope.');
				return false;
			}
			$id = $post->ID;
		}
		
		// Build our URL args
		$url_args = array(
			$this->action 	=> 'download_xml',
			'article' 		=> intval($id),
		);
		
		return add_query_arg($url_args, home_url());
	}
	
	/**
	 * Conditionally logs messages to the error log
	 *
	 * @param string $msg 
	 * @return void
	 */
	private function log($msg) {
		if ($this->debug) {
			error_log($msg);
		}
	}	
}
Anno_XML_Download::i()->add_actions();
	

/**
 * Get the XML download link for a post
 *
 * @param int $id 
 * @return string
 */
function anno_xml_download_url($id = null) {
	return Anno_XML_Download::i()->get_download_url($id);
}

?>