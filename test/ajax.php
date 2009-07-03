<?php

	function getHeader($h){	
		$all = '';	
		foreach ($_SERVER as $k => $v){
			if ($k == "HTTP_".$h){
				return $v;
			}
			$all .= ", " . $k;			
		}
		return $all;
	}

	$test = $_REQUEST['test'];
	$parm1 = $_REQUEST['parm1'];
	$parm2 = $_REQUEST['parm2'];
	
	
	if( $test == "basic" ) {
		echo "basic";
	} else if( $test == "head" ) {		
		echo getHeader("TEST");
	} else if( $test == "form1" ) {
		echo $parm1 . " - " . $parm2;
	} else if( $test == "form2" ) {
		echo $parm1[0] . " - " . $parm1[1];
	}
?>